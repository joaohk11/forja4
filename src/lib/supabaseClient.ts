// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

/**
 * Cria ou retorna o cliente Supabase com URL e chave passadas.
 * Se você já tiver um cliente global, ele será reutilizado.
 */
export const getSupabaseClient = (url: string, key: string) => {
  if (!url || !key) throw new Error('Supabase URL e Key são obrigatórios');
  
  if (!supabase) {
    supabase = createClient(url, key, {
      auth: { persistSession: false }, // não persiste sessão, ideal para backup
      global: { headers: { 'X-Client-Info': 'forja-backup-app' } },
    });
  }

  return supabase;
};
