import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface LineupRow {
  id: string;
  team_id: string;
  nome?: string;
  data?: string;
}

export interface LineupPlayerRow {
  id: string;
  lineup_id: string;
  athlete_id: string;
  posicao_quadra: string;
}

export const lineupService = {
  async getAll(teamId: string): Promise<LineupRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('lineups')
      .select('*')
      .eq('team_id', teamId)
      .order('data', { ascending: false });
    if (error) { console.error('lineupService.getAll:', error); return []; }
    return data || [];
  },

  async create(lineup: Omit<LineupRow, 'id'>): Promise<LineupRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('lineups')
      .insert(lineup)
      .select()
      .single();
    if (error) { console.error('lineupService.create:', error); return null; }
    return data;
  },

  async setPlayers(lineupId: string, players: Omit<LineupPlayerRow, 'id'>[]): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    await supabase.from('lineup_players').delete().eq('lineup_id', lineupId);
    if (players.length === 0) return true;
    const { error } = await supabase.from('lineup_players').insert(players);
    if (error) { console.error('lineupService.setPlayers:', error); return false; }
    return true;
  },

  async getPlayers(lineupId: string): Promise<LineupPlayerRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('lineup_players')
      .select('*')
      .eq('lineup_id', lineupId);
    if (error) { console.error('lineupService.getPlayers:', error); return []; }
    return data || [];
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('lineups').delete().eq('id', id);
    if (error) { console.error('lineupService.delete:', error); return false; }
    return true;
  },
};
