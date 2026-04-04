import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = false;
export const supabase: SupabaseClient | null = null;

export const getSupabaseClient = (url: string, key: string): SupabaseClient => {
  if (!url || !key) throw new Error('Supabase URL e Key são obrigatórios');
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'forja-backup-app' } },
  });
};
