import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface AthleteRow {
  id: string;
  team_id: string;
  nome: string;
  numero: number;
  posicao: string;
  altura?: string;
  idade?: number;
  foto?: string;
  observacao?: string;
}

export const athletesService = {
  async getAll(teamId: string): Promise<AthleteRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('team_id', teamId)
      .order('numero');
    if (error) { console.error('athletesService.getAll:', error); return []; }
    return data || [];
  },

  async create(athlete: Omit<AthleteRow, 'id'>): Promise<AthleteRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('athletes')
      .insert(athlete)
      .select()
      .single();
    if (error) { console.error('athletesService.create:', error); return null; }
    return data;
  },

  async update(id: string, updates: Partial<AthleteRow>): Promise<AthleteRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('athletesService.update:', error); return null; }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (error) { console.error('athletesService.delete:', error); return false; }
    return true;
  },

  subscribeToChanges(teamId: string, onUpdate: () => void) {
    if (!isSupabaseConfigured || !supabase) return null;
    return supabase
      .channel(`athletes:team:${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes', filter: `team_id=eq.${teamId}` }, onUpdate)
      .subscribe();
  },
};
