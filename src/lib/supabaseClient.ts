// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

// --- Função para criar ou atualizar o cliente Supabase ---
export const getSupabaseClient = (url?: string, key?: string) => {
  if (!url || !key) {
    // Se já existe, retorna o cliente existente
    if (!supabase) throw new Error('Supabase não configurado');
    return supabase;
  }

  // Cria um novo cliente
  supabase = createClient(url, key);
  return supabase;
};

// --- Cliente padrão, carregado do localStorage se existir ---
try {
  const savedConfig = localStorage.getItem('supabase_config');
  if (savedConfig) {
    const { url, key } = JSON.parse(savedConfig);
    if (url && key) supabase = createClient(url, key);
  }
} catch {
  // Falha silenciosa, usuário ainda precisa configurar
}

export { supabase };
