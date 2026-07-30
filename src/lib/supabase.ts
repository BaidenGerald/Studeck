import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// We use an untyped client (`any` Database) because our typed Database shape
// doesn't model every RPC signature the supabase-js generics expect, which
// produces noisy type errors on .rpc() and .insert() calls. Query helpers in
// queries.ts cast results to our domain types at the boundary instead.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const MATERIALS_BUCKET = 'materials';
