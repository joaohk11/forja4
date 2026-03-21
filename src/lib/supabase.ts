import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'forja_supabase_config';

interface SupabaseConfig {
  url: string;
  key: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!raw) return null;

    const config = JSON.parse(raw);

    if (!config.url || !config.key) return null;

    return config;
  } catch {
    return null;
  }
}

export function getSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error('Supabase não configurado');
  }

  return createClient(config.url, config.key);
}
