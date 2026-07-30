/*
# Academic Materials Platform — Core Schema

1. Purpose
   A platform where students upload and download academic materials (lecture notes,
   past questions, textbooks, slides), organized by course and department, with
   full-text search, AI-assisted content tagging, and personalized recommendations.

2. New Tables
   - `departments`  : academic departments (reference data, public read).
   - `courses`      : courses belonging to a department.
   - `profiles`     : user profile extending auth.users (auto-created on signup).
   - `materials`    : academic materials with tags + full-text search vector.
   - `downloads`    : tracks who downloaded what (powers recommendations + counts).
   - `favorites`    : bookmarked materials per user.

3. AI / Search features
   - `materials.search_vector` is a tsvector maintained by a trigger, combining
     title (weight A), description (weight B), and tags (weight C). Enables
     ranked full-text search via websearch_to_tsquery.
   - GIN indexes on search_vector and tags for fast lookups.

4. Storage
   - Creates a public `materials` storage bucket.
   - Storage policies: public read; authenticated upload; owner-only update/delete.

5. Security (RLS)
   - departments, courses : public read (anon, authenticated), no client writes.
   - profiles             : read for all authenticated; update own only.
   - materials            : read for all authenticated; insert/update/delete own only.
   - downloads            : read/insert/delete own.
   - favorites            : read/insert/delete own.
   - All owner columns default to auth.uid() so client inserts omitting owner succeed.

6. Auth helper
   - Trigger `on_auth_user_created` inserts a profile row whenever a new auth.users
     row is created, using metadata from signUp (full_name, department_id, level).

7. Notes
   - Multi-user app with a sign-in screen, so policies are scoped to `authenticated`
     (except reference data which is public, and storage reads).
*/

-- ============ departments ============
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_departments" ON departments;
CREATE POLICY "public_read_departments"
  ON departments FOR SELECT TO anon, authenticated USING (true);

-- ============ courses ============
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  level text NOT NULL,
  semester text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (department_id, code)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_courses" ON courses;
CREATE POLICY "public_read_courses"
  ON courses FOR SELECT TO anon, authenticated USING (true);

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  level text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ materials ============
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'notes',
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  level text,
  uploader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  tags text[] NOT NULL DEFAULT '{}',
  download_count int NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materials_search_vector_idx ON materials USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS materials_tags_idx ON materials USING GIN (tags);
CREATE INDEX IF NOT EXISTS materials_course_id_idx ON materials (course_id);
CREATE INDEX IF NOT EXISTS materials_department_id_idx ON materials (department_id);
CREATE INDEX IF NOT EXISTS materials_uploader_id_idx ON materials (uploader_id);
CREATE INDEX IF NOT EXISTS materials_type_idx ON materials (type);
CREATE INDEX IF NOT EXISTS materials_created_at_idx ON materials (created_at DESC);

-- trigger to keep search_vector in sync with title/description/tags
CREATE OR REPLACE FUNCTION public.materials_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS materials_search_vector_trigger ON materials;
CREATE TRIGGER materials_search_vector_trigger
  BEFORE INSERT OR UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION public.materials_search_vector_update();

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_materials" ON materials;
CREATE POLICY "read_materials"
  ON materials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_material" ON materials;
CREATE POLICY "insert_own_material"
  ON materials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "update_own_material" ON materials;
CREATE POLICY "update_own_material"
  ON materials FOR UPDATE TO authenticated
  USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "delete_own_material" ON materials;
CREATE POLICY "delete_own_material"
  ON materials FOR DELETE TO authenticated
  USING (auth.uid() = uploader_id);

-- ============ downloads ============
CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, material_id)
);

CREATE INDEX IF NOT EXISTS downloads_user_id_idx ON downloads (user_id);
CREATE INDEX IF NOT EXISTS downloads_material_id_idx ON downloads (material_id);

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_downloads" ON downloads;
CREATE POLICY "read_own_downloads"
  ON downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_download" ON downloads;
CREATE POLICY "insert_own_download"
  ON downloads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_download" ON downloads;
CREATE POLICY "delete_own_download"
  ON downloads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ favorites ============
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, material_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);
CREATE INDEX IF NOT EXISTS favorites_material_id_idx ON favorites (material_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_favorites" ON favorites;
CREATE POLICY "read_own_favorites"
  ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorite" ON favorites;
CREATE POLICY "insert_own_favorite"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorite" ON favorites;
CREATE POLICY "delete_own_favorite"
  ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, department_id, level)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', 'New Student'),
    NEW.email,
    nullif(NEW.raw_user_meta_data->>'department_id', '')::uuid,
    nullif(NEW.raw_user_meta_data->>'level', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ storage bucket for material files ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_materials_bucket" ON storage.objects;
CREATE POLICY "public_read_materials_bucket"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "auth_upload_materials_bucket" ON storage.objects;
CREATE POLICY "auth_upload_materials_bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "owner_update_materials_bucket" ON storage.objects;
CREATE POLICY "owner_update_materials_bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materials' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'materials' AND owner = auth.uid());

DROP POLICY IF EXISTS "owner_delete_materials_bucket" ON storage.objects;
CREATE POLICY "owner_delete_materials_bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND owner = auth.uid());
