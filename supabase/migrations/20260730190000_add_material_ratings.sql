/*
# Material Ratings

1. New Table
   - `ratings` : one row per (user, material) — a 1-5 star rating with an optional
     written review. Users can rate a material once, and edit their own rating.

2. Denormalized stats
   - `materials.rating_avg` and `materials.rating_count` are kept in sync via a
     trigger on `ratings` so the frontend can read/sort by rating without an
     extra aggregate query on every list view.

3. Security (RLS)
   - ratings : read for all authenticated; insert/update/delete own only.

4. Notes
   - `smart_search` and `recommend_materials` are recreated (DROP + CREATE, since
     changing a function's RETURNS TABLE requires a drop) so their result rows
     include rating_avg/rating_count, matching the updated `materials` shape.
*/

-- ============ materials: rating columns ============
ALTER TABLE materials ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

-- ============ ratings ============
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, material_id)
);

CREATE INDEX IF NOT EXISTS ratings_material_id_idx ON ratings (material_id);
CREATE INDEX IF NOT EXISTS ratings_user_id_idx ON ratings (user_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_ratings" ON ratings;
CREATE POLICY "read_ratings"
  ON ratings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_rating" ON ratings;
CREATE POLICY "insert_own_rating"
  ON ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rating" ON ratings;
CREATE POLICY "update_own_rating"
  ON ratings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rating" ON ratings;
CREATE POLICY "delete_own_rating"
  ON ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- keep materials.rating_avg / rating_count in sync with the ratings table
CREATE OR REPLACE FUNCTION public.ratings_sync_material_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_material_id uuid := COALESCE(NEW.material_id, OLD.material_id);
BEGIN
  UPDATE materials m
  SET rating_avg = COALESCE(
        (SELECT ROUND(AVG(rating)::numeric, 2) FROM ratings WHERE material_id = v_material_id), 0
      ),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE material_id = v_material_id)
  WHERE m.id = v_material_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ratings_sync_trigger ON ratings;
CREATE TRIGGER ratings_sync_trigger
  AFTER INSERT OR UPDATE OF rating OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION public.ratings_sync_material_stats();

-- keep updated_at current on edits
CREATE OR REPLACE FUNCTION public.ratings_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_updated_at_trigger ON ratings;
CREATE TRIGGER ratings_updated_at_trigger
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION public.ratings_set_updated_at();

-- ============ recreate smart_search / recommend_materials with rating columns ============
DROP FUNCTION IF EXISTS public.smart_search(text, uuid, uuid, text, text, int);
DROP FUNCTION IF EXISTS public.recommend_materials(uuid, int);

CREATE OR REPLACE FUNCTION public.recommend_materials(p_user uuid, p_limit int DEFAULT 12)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  course_id uuid,
  department_id uuid,
  level text,
  uploader_id uuid,
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  tags text[],
  download_count int,
  rating_avg numeric,
  rating_count int,
  created_at timestamptz,
  score float8,
  reason text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_tags text[];
  v_user_depts uuid[];
  v_user_courses uuid[];
BEGIN
  SELECT array_agg(DISTINCT t) INTO v_user_tags
  FROM downloads d
  JOIN materials m ON m.id = d.material_id
  LEFT JOIN unnest(m.tags) AS t ON true
  WHERE d.user_id = p_user;

  SELECT array_agg(DISTINCT m.department_id) INTO v_user_depts
  FROM downloads d JOIN materials m ON m.id = d.material_id
  WHERE d.user_id = p_user;

  SELECT array_agg(DISTINCT m.course_id) INTO v_user_courses
  FROM downloads d JOIN materials m ON m.id = d.material_id
  WHERE d.user_id = p_user;

  RETURN QUERY
  SELECT
    m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
    m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
    m.download_count, m.rating_avg, m.rating_count, m.created_at,
    (coalesce(array_length(array(
      SELECT 1 FROM unnest(m.tags) mt
      WHERE mt = ANY(coalesce(v_user_tags, ARRAY[]::text[]))
    ), 1), 0) * 3
     + CASE WHEN m.department_id = ANY(coalesce(v_user_depts, ARRAY[]::uuid[])) THEN 1 ELSE 0 END
     + CASE WHEN m.course_id = ANY(coalesce(v_user_courses, ARRAY[]::uuid[])) THEN 2 ELSE 0 END
     + (EXTRACT(epoch FROM (now() - m.created_at)) / 604800.0)::float8 * -0.1
    )::float8 AS score,
    CASE
      WHEN m.course_id = ANY(coalesce(v_user_courses, ARRAY[]::uuid[])) THEN 'Matches a course you downloaded'
      WHEN array_length(array(
        SELECT 1 FROM unnest(m.tags) mt
        WHERE mt = ANY(coalesce(v_user_tags, ARRAY[]::text[]))
      ), 1) > 0 THEN 'Similar topics to your downloads'
      WHEN m.department_id = ANY(coalesce(v_user_depts, ARRAY[]::uuid[])) THEN 'From your department'
      ELSE 'Popular on the platform'
    END AS reason
  FROM materials m
  WHERE m.uploader_id <> p_user
    AND m.id NOT IN (SELECT material_id FROM downloads WHERE user_id = p_user)
  ORDER BY score DESC, m.download_count DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.smart_search(
  p_query text,
  p_department uuid DEFAULT NULL,
  p_course uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_level text DEFAULT NULL,
  p_limit int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  course_id uuid,
  department_id uuid,
  level text,
  uploader_id uuid,
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  tags text[],
  download_count int,
  rating_avg numeric,
  rating_count int,
  created_at timestamptz,
  rank float8
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(p_query, '') = '' THEN
    RETURN QUERY
    SELECT
      m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
      m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
      m.download_count, m.rating_avg, m.rating_count, m.created_at, 0::float8 AS rank
    FROM materials m
    WHERE (p_department IS NULL OR m.department_id = p_department)
      AND (p_course IS NULL OR m.course_id = p_course)
      AND (p_type IS NULL OR m.type = p_type)
      AND (p_level IS NULL OR m.level = p_level)
    ORDER BY m.download_count DESC, m.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
    m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
    m.download_count, m.rating_avg, m.rating_count, m.created_at,
    ts_rank(m.search_vector, websearch_to_tsquery('english', p_query))::float8 AS rank
  FROM materials m
  WHERE m.search_vector @@ websearch_to_tsquery('english', p_query)
    AND (p_department IS NULL OR m.department_id = p_department)
    AND (p_course IS NULL OR m.course_id = p_course)
    AND (p_type IS NULL OR m.type = p_type)
    AND (p_level IS NULL OR m.level = p_level)
  ORDER BY rank DESC, m.download_count DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;
