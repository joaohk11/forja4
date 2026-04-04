import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CloudBackup {
  id: string;
  name: string;
  data: string;
  Created_at: string;
}

export async function saveBackup(data: unknown): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

  const name = `FORJA — ${new Date().toLocaleString('pt-BR')}`;
  const { error } = await supabase.from('backups').insert([{ name, data: JSON.stringify(data) }]);
  if (error) {
    console.error('backupService.saveBackup:', error);
    throw error;
  }
}

export async function getBackups(): Promise<CloudBackup[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .order('Created_at', { ascending: false });

  if (error) {
    console.error('backupService.getBackups:', error);
    throw error;
  }
  return data || [];
}

export async function restoreBackup(id: string): Promise<unknown> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('backupService.restoreBackup:', error);
    throw error;
  }
  return JSON.parse(data.data);
}

export async function deleteBackup(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase.from('backups').delete().eq('id', id);
  if (error) {
    console.error('backupService.deleteBackup:', error);
    throw error;
  }
}
