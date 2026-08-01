import { supabase, MATERIALS_BUCKET, AVATARS_BUCKET } from '@/lib/supabase';
import type {
  Department,
  Course,
  Material,
  MaterialWithRelations,
  RecommendedMaterial,
  SearchResult,
  MaterialType,
  Rating,
} from '@/types/database';

// ---- reference data ----
export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Department[];
}

export async function fetchCoursesByDepartment(departmentId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('department_id', departmentId)
    .order('level')
    .order('code');
  if (error) throw error;
  return data as Course[];
}

export async function fetchAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').order('code');
  if (error) throw error;
  return data as Course[];
}

// ---- materials ----
const MATERIAL_RELATIONS =
  'id, title, description, type, course_id, department_id, level, uploader_id, file_path, file_name, file_type, file_size, tags, download_count, rating_avg, rating_count, created_at, course:courses(id, code, title), department:departments(id, name, code, icon), uploader:profiles!materials_uploader_id_profiles_fkey(id, full_name,  avatar_url)';

export async function fetchMaterialById(id: string): Promise<MaterialWithRelations | null> {
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_RELATIONS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as MaterialWithRelations | null;
}

export async function fetchRecentMaterials(limit = 12): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_RELATIONS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as MaterialWithRelations[];
}

export async function fetchPopularMaterials(limit = 8): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_RELATIONS)
    .order('download_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as MaterialWithRelations[];
}

export async function fetchMaterialsByDepartment(
  departmentId: string,
  limit = 50
): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_RELATIONS)
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as MaterialWithRelations[];
}

export async function fetchMyUploads(userId: string): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_RELATIONS)
    .eq('uploader_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MaterialWithRelations[];
}

export async function fetchMyDownloads(userId: string): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('downloads')
    .select(`created_at, material:materials(${MATERIAL_RELATIONS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Flatten the nested material out of each download row
  const rows = (data ?? []) as unknown as {
    created_at: string;
    material: MaterialWithRelations;
  }[];
  return rows.map((r) => r.material).filter((m) => m && m.id);
}

export async function fetchMyFavorites(userId: string): Promise<MaterialWithRelations[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`created_at, material:materials(${MATERIAL_RELATIONS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    created_at: string;
    material: MaterialWithRelations;
  }[];
  return rows.map((r) => r.material).filter((m) => m && m.id);
}

// ---- AI search + recommendations (RPC) ----
export async function smartSearch(params: {
  query: string;
  departmentId?: string | null;
  courseId?: string | null;
  type?: MaterialType | null;
  level?: string | null;
  limit?: number;
}): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('smart_search', {
    p_query: params.query,
    p_department: params.departmentId ?? null,
    p_course: params.courseId ?? null,
    p_type: params.type ?? null,
    p_level: params.level ?? null,
    p_limit: params.limit ?? 24,
  });
  if (error) throw error;
  return (data ?? []) as unknown as SearchResult[];
}

export async function fetchRecommendations(userId: string, limit = 12): Promise<RecommendedMaterial[]> {
  const { data, error } = await supabase.rpc('recommend_materials', {
    p_user: userId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as RecommendedMaterial[];
}

// ---- favorites / downloads ----
export async function toggleFavorite(userId: string, materialId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle();
  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('material_id', materialId);
    return false;
  }
  await supabase.from('favorites').insert({ user_id: userId, material_id: materialId });
  return true;
}

export async function isFavorited(userId: string, materialId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle();
  return !!data;
}

export async function recordDownload(userId: string, material: Material): Promise<boolean> {
  // Insert download record. The (user_id, material_id) unique constraint means this
  // fails with a 23505 (unique_violation) if the user already downloaded this file
  // before — in that case we must NOT bump the counter again, or repeat downloads
  // would inflate download_count indefinitely.
  const { error: insertError } = await supabase
    .from('downloads')
    .insert({ user_id: userId, material_id: material.id });

  if (insertError) {
    if (insertError.code === '23505') return false; // already downloaded, not an error
    throw insertError;
  }

  // Bump download_count atomically via RPC — only reached for first-time downloads.
  await supabase.rpc('increment_download', { p_material: material.id });
  return true;
}

export async function getPublicFileUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function downloadMaterialFile(material: Material): Promise<void> {
  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(material.file_path, 60);
  if (error || !data?.signedUrl) throw error ?? new Error('Could not generate download URL');

  // The signed URL points at Supabase's own domain, not ours. Browsers ignore
  // the <a download> attribute for cross-origin links, so a plain <a> click
  // would just open the file in a new tab instead of downloading it (and
  // wouldn't respect our chosen filename). Fetching the bytes ourselves and
  // downloading from a same-origin blob: URL avoids both problems.
  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error('Failed to fetch file for download.');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = material.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Revoke on a delay so the browser has time to actually start the download.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  }
}

// ---- upload ----
export async function uploadMaterialFile(
  userId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function createMaterial(input: {
  title: string;
  description: string;
  type: MaterialType;
  courseId: string | null;
  departmentId: string | null;
  level: string | null;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  tags: string[];
}): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .insert({
      title: input.title,
      description: input.description,
      type: input.type,
      course_id: input.courseId,
      department_id: input.departmentId,
      level: input.level,
      file_path: input.filePath,
      file_name: input.fileName,
      file_type: input.fileType,
      file_size: input.fileSize,
      tags: input.tags,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Material;
}

export async function deleteMaterial(material: Material): Promise<void> {
  // Remove the file from storage, then the row.
  await supabase.storage.from(MATERIALS_BUCKET).remove([material.file_path]);
  const { error } = await supabase.from('materials').delete().eq('id', material.id);
  if (error) throw error;
}

// ---- AI auto-tagging (edge function) ----
export async function autoTagMaterial(input: {
  title: string;
  description: string;
  type: string;
  courseTitle?: string;
  departmentName?: string;
}): Promise<{ tags: string[]; matchedKeywords: string[] }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-tag`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    return { tags: [], matchedKeywords: [] };
  }
  const json = (await res.json()) as { tags?: string[]; matchedKeywords?: string[] };
  return { tags: json.tags ?? [], matchedKeywords: json.matchedKeywords ?? [] };
}

export async function persistAutoTags(materialId: string, tags: string[]): Promise<void> {
  const { error } = await supabase.from('materials').update({ tags }).eq('id', materialId);
  if (error) throw error;
}

// ---- ratings ----
export async function fetchMyRating(userId: string, materialId: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle();
  if (error) throw error;
  return data as Rating | null;
}

export async function fetchRatingsForMaterial(materialId: string, limit = 10): Promise<
  (Rating & { rater: { full_name: string } | null })[]
> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, rater:profiles!ratings_user_id_profiles_fkey(full_name)')
    .eq('material_id', materialId)
    .not('review', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as (Rating & { rater: { full_name: string } | null })[];
}

// Upserts the current user's rating for a material (one rating per user per material).
export async function rateMaterial(
  userId: string,
  materialId: string,
  rating: number,
  review?: string | null
): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .upsert(
      { user_id: userId, material_id: materialId, rating, review: review || null },
      { onConflict: 'user_id,material_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as Rating;
}

export async function deleteRating(userId: string, materialId: string): Promise<void> {
  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('user_id', userId)
    .eq('material_id', materialId);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  input: {
    full_name: string;
    bio: string;
    department_id: string | null;
    level: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name,
      bio: input.bio || null,
      department_id: input.department_id,
      level: input.level,
    })
    .eq('id', userId);
  if (error) throw error;
}

// Uploads a new avatar image, replacing any previous one, and saves the
// resulting public URL onto the user's profile. Returns the new URL.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
}

export async function removeAvatar(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw error;
}
