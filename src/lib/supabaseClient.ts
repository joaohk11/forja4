import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Certifique-se de ter essas variáveis no Vercel ou .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente Supabase principal
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Função para compatibilidade com arquivos que usam getSupabaseClient
export const getSupabaseClient = () => supabase;
