export type MaterialType = 'notes' | 'past-question' | 'textbook' | 'slides' | 'lab-report' | 'summary';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  department_id: string;
  code: string;
  title: string;
  level: string;
  semester: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  department_id: string | null;
  level: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  course_id: string | null;
  department_id: string | null;
  level: string | null;
  uploader_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  tags: string[];
  download_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface MaterialWithRelations extends Material {
  course?: Pick<Course, 'id' | 'code' | 'title'> | null;
  department?: Pick<Department, 'id' | 'name' | 'code' | 'icon'> | null;
  uploader?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface Rating {
  id: string;
  user_id: string;
  material_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  user_id: string;
  material_id: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  material_id: string;
  created_at: string;
}

export interface RecommendedMaterial extends Material {
  score: number;
  reason: string;
}

export interface SearchResult extends Material {
  rank: number;
}

// Minimal Database type for the supabase client generic. We query through typed
// helper functions in src/lib/queries.ts so this just needs the table map.
export interface Database {
  public: {
    Tables: {
      departments: { Row: Department; Insert: Partial<Department>; Update: Partial<Department> };
      courses: { Row: Course; Insert: Partial<Course>; Update: Partial<Course> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      materials: { Row: Material; Insert: Partial<Material>; Update: Partial<Material> };
      downloads: { Row: Download; Insert: Partial<Download>; Update: Partial<Download> };
      favorites: { Row: Favorite; Insert: Partial<Favorite>; Update: Partial<Favorite> };
      ratings: { Row: Rating; Insert: Partial<Rating>; Update: Partial<Rating> };
    };
    Functions: {
      recommend_materials: {
        Args: { p_user: string; p_limit?: number };
        Returns: RecommendedMaterial;
      };
      smart_search: {
        Args: {
          p_query: string;
          p_department?: string | null;
          p_course?: string | null;
          p_type?: string | null;
          p_level?: string | null;
          p_limit?: number;
        };
        Returns: SearchResult;
      };
      increment_download: {
        Args: { p_material: string };
        Returns: number;
      };
    };
  };
}
