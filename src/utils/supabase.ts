import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let client: Promise<SupabaseClient | null> | undefined;

/**
 * The Supabase client, created on first use. Its library (about 220 kB minified) is loaded as a
 * separate chunk to keep it out of the main bundle; useAuthSync asks for it at start-up, so it is
 * ready by the time anything else needs it. Resolves to null when cloud sync isn't configured, and
 * rejects if the chunk can't be fetched (callers then carry on without the cloud).
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!client) {
    client = hasSupabaseConfig
      ? import('@supabase/supabase-js').then(({ createClient }) => createClient(supabaseUrl as string, supabaseAnonKey as string))
      : Promise.resolve(null);
  }
  return client;
}
