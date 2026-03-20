import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface TrainingRow {
  id: string;
  team_id: string;
  nome: string;
  data: string;
  duracao: number;
  status: string;
  focus_tag?: string;
  favorito?: boolean;
}

export interface TrainingModuleRow {
  id: string;
  training_id: string;
  tipo?: string;
  block_type?: string;
  fundamento?: string;
  descricao?: string;
  duracao?: number;
  status?: string;
  observacao?: string;
  skill_observation?: string;
  skills?: string[];
  positions?: string[];
  ordem?: number;
}

export const trainingService = {
  async getAll(teamId: string): Promise<TrainingRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('team_id', teamId)
      .order('data', { ascending: false });
    if (error) { console.error('trainingService.getAll:', error); return []; }
    return data || [];
  },

  async create(training: Omit<TrainingRow, 'id'>): Promise<TrainingRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('trainings')
      .insert(training)
      .select()
      .single();
    if (error) { console.error('trainingService.create:', error); return null; }
    return data;
  },

  async update(id: string, updates: Partial<TrainingRow>): Promise<TrainingRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('trainings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('trainingService.update:', error); return null; }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('trainings').delete().eq('id', id);
    if (error) { console.error('trainingService.delete:', error); return false; }
    return true;
  },

  async getModules(trainingId: string): Promise<TrainingModuleRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('training_modules')
      .select('*')
      .eq('training_id', trainingId)
      .order('ordem');
    if (error) { console.error('trainingService.getModules:', error); return []; }
    return data || [];
  },

  subscribeToExecution(trainingId: string, onUpdate: () => void) {
    if (!isSupabaseConfigured || !supabase) return null;
    return supabase
      .channel(`training_exec:${trainingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_execution', filter: `training_id=eq.${trainingId}` }, onUpdate)
      .subscribe();
  },
};
