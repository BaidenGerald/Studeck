/*
# Recommendation + Search helper functions

1. New Functions
   - recommend_materials(p_user uuid, p_limit int)
       Returns materials recommended for a user based on their download history.
       Strategy: gather tags + department_ids + courses from the user's downloaded
       materials, then score every candidate material by overlapping tags and
       matching department/course. Already-downloaded and own uploads are excluded.
       Results are ordered by score then recency.
   - smart_search(p_query text, p_department uuid, p_course uuid, p_type text,
                  p_level text, p_limit int)
       Ranked full-text search over materials with optional filters. Uses
       websearch_to_tsquery so users can type natural queries ("calculus
       integration past question"). Returns relevance-ranked rows.
   - increment_download(p_material uuid)
       Atomically bumps download_count and returns the new value.

2. Security
   - All functions run with SECURITY INVOKER so RLS applies to the calling user.
     No SECURITY DEFINER, no service-role escalation.

3. Notes
   - These functions return SETOF materials so the frontend can treat them like
     any other materials query. The recommendation score is exposed via a
     composite return type so the UI can show "why recommended" if desired.
*/

-- ============ recommend_materials ============
-- Returns a set of (material row + recommendation score + reason tag).
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
  -- Build a user interest profile from their download history.
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

  -- Score every candidate material (excluding already-downloaded and own uploads).
  RETURN QUERY
  SELECT
    m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
    m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
    m.download_count, m.created_at,
    -- score: tag overlap (3 each) + dept match (1) + course match (2) + recency boost
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

-- ============ smart_search ============
-- Ranked full-text search with optional department/course/type/level filters.
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
  created_at timestamptz,
  rank float8
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Empty query: return recent popular materials (no text match needed).
  IF coalesce(p_query, '') = '' THEN
    RETURN QUERY
    SELECT
      m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
      m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
      m.download_count, m.created_at, 0::float8 AS rank
    FROM materials m
    WHERE (p_department IS NULL OR m.department_id = p_department)
      AND (p_course IS NULL OR m.course_id = p_course)
      AND (p_type IS NULL OR m.type = p_type)
      AND (p_level IS NULL OR m.level = p_level)
    ORDER BY m.download_count DESC, m.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Text query: ranked full-text search.
  RETURN QUERY
  SELECT
    m.id, m.title, m.description, m.type, m.course_id, m.department_id, m.level,
    m.uploader_id, m.file_path, m.file_name, m.file_type, m.file_size, m.tags,
    m.download_count, m.created_at,
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

-- ============ increment_download ============
-- Atomically bumps download_count and returns the new value.
CREATE OR REPLACE FUNCTION public.increment_download(p_material uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE materials SET download_count = download_count + 1
  WHERE id = p_material
  RETURNING download_count INTO v_new_count;
  RETURN v_new_count;
END;
$$;
