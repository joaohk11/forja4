import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'forja_supabase_config';

function getSupabaseCredentials(): { url: string; key: string } | null {
  // 1. Try Vite env vars (set by developer)
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (
    envUrl && envKey &&
    envUrl !== 'your-supabase-url' &&
    envKey !== 'your-supabase-anon-key'
  ) {
    return { url: envUrl, key: envKey };
  }

  // 2. Fallback: credentials saved by the user in BackupPage
  try {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.url && parsed?.key) return { url: parsed.url, key: parsed.key };
    }
  } catch {}

  return null;
}

function buildClient(): { client: SupabaseClient | null; configured: boolean } {
  const creds = getSupabaseCredentials();
  if (!creds) return { client: null, configured: false };
  try {
    return { client: createClient(creds.url, creds.key), configured: true };
  } catch {
    return { client: null, configured: false };
  }
}

const { client, configured } = buildClient();

export const isSupabaseConfigured = configured;
export const supabase = client;

/** Call this to get a fresh client using the latest localStorage credentials. */
export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) return null;
  try {
    return createClient(creds.url, creds.key);
  } catch {
    return null;
  }
}

export default supabase;
