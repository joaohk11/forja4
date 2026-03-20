import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { AccessLinkType, AccessLinkRole } from '@/lib/types';

export interface AccessLink {
  id: string;
  token: string;
  tipo: AccessLinkType;
  reference_id: string;
  role: AccessLinkRole;
  created_at?: string;
}

export const accessService = {
  async validateToken(token: string): Promise<AccessLink | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('access_links')
      .select('*')
      .eq('token', token)
      .single();
    if (error) return null;
    return data;
  },

  async createLink(link: Omit<AccessLink, 'id' | 'created_at'>): Promise<AccessLink | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('access_links')
      .insert(link)
      .select()
      .single();
    if (error) { console.error('accessService.createLink:', error); return null; }
    return data;
  },

  async revokeToken(token: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { error } = await supabase.from('access_links').delete().eq('token', token);
    if (error) { console.error('accessService.revokeToken:', error); return false; }
    return true;
  },

  generateToken(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },
};

// URL token helper — reads from current URL search params
export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}
