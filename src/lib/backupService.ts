export interface CloudBackup {
  id: string;
  name: string;
  data?: string;
  created_at: string;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Read as text first — some responses may have an empty body
  const text = await res.text();

  if (!text || text.trim() === '') {
    if (res.ok) return {} as T;
    throw new Error(`Erro ${res.status}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    if (res.ok) return {} as T;
    throw new Error(`Erro ${res.status}: resposta inválida do servidor`);
  }

  if (!res.ok) throw new Error(json?.detail || json?.error || `Erro ${res.status}`);
  return json as T;
}

export async function saveBackup(data: unknown): Promise<void> {
  await api('POST', '/api/backup/save', { data: JSON.stringify(data) });
}

export async function getBackups(): Promise<CloudBackup[]> {
  return api<CloudBackup[]>('GET', '/api/backup/list');
}

export async function restoreBackup(id: string): Promise<unknown> {
  const backup = await api<CloudBackup>('GET', `/api/backup/load/${id}`);
  if (!backup.data) throw new Error('Backup vazio');
  return JSON.parse(backup.data);
}

export async function deleteBackup(id: string): Promise<void> {
  await api('DELETE', `/api/backup/delete/${id}`);
}
