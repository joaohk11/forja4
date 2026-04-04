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
  async validateToken(_token: string): Promise<AccessLink | null> {
    return null;
  },

  async createLink(_link: Omit<AccessLink, 'id' | 'created_at'>): Promise<AccessLink | null> {
    return null;
  },

  async revokeToken(_token: string): Promise<boolean> {
    return false;
  },

  generateToken(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },
};

export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}
