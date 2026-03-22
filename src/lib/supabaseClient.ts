// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Retorna um cliente Supabase configurado.
 * Não mantém cliente global, evitando problemas no build do Vercel.
 */
export const getSupabaseClient = (url: string, key: string): SupabaseClient => {
  if (!url || !key) throw new Error('Supabase URL e Key são obrigatórios');
  
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'forja-backup-app' } },
  });
};
