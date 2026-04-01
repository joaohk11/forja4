import { supabase, supabaseConfigured } from './supabaseClient';

export interface CloudBackup {
  id: string;
  Name: string;
  Data: string;
  Created_at: string;
}

function assertConfigured() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
  }
}

export async function saveBackup(data: unknown): Promise<void> {
  assertConfigured();
  const Name = `FORJA - ${new Date().toLocaleString('pt-BR')}`;
  const Created_at = new Date().toISOString();
  const { error } = await supabase!.from('backups').insert([
    { Name, Data: JSON.stringify(data), Created_at },
  ]);
  if (error) {
    console.error('[backupService] saveBackup error:', error);
    throw error;
  }
}

export async function getBackups(): Promise<CloudBackup[]> {
  assertConfigured();
  const { data, error } = await supabase!
    .from('backups')
    .select('*')
    .order('Created_at', { ascending: false });
  if (error) {
    console.error('[backupService] getBackups error:', error);
    throw error;
  }
  return (data as CloudBackup[]) || [];
}

export async function restoreBackup(id: string): Promise<unknown> {
  assertConfigured();
  const { data, error } = await supabase!
    .from('backups')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[backupService] restoreBackup error:', error);
    throw error;
  }
  return JSON.parse((data as CloudBackup).Data);
}

export async function deleteBackup(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase!.from('backups').delete().eq('id', id);
  if (error) {
    console.error('[backupService] deleteBackup error:', error);
    throw error;
  }
}
