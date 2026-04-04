import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };
}

function isSupabaseReady() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// ─── PERSONALIDADE FORJA ──────────────────────────────────────────────────────
const PERSONALIDADE_FORJA = `Você é o FORJA, um treinador profissional de voleibol de alto nível.
Seja técnico, direto e focado em evolução progressiva.
Nunca gere respostas genéricas.
Sempre estruture treinos em blocos com tempo e objetivo.
Funções possíveis: TREINADOR, ANALISTA, ADAPTADOR.`;

async function chamarIA(funcao: string, dados: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada no servidor.');

  const prompt = `${PERSONALIDADE_FORJA}\n\nFunção atual: ${funcao}\n\n${dados}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const rawText = await response.text();
  if (!response.ok) {
    console.error('Gemini error — status:', response.status, 'body:', rawText);
    if (response.status === 429) throw new Error('Limite de requisições do Gemini atingido. Aguarde alguns minutos.');
    if (response.status === 403) throw new Error('Chave GEMINI_API_KEY inválida ou sem permissão.');
    throw new Error(`Gemini retornou status ${response.status}`);
  }

  let data: any;
  try { data = JSON.parse(rawText); } catch { throw new Error('Resposta inesperada do servidor de IA.'); }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta gerada';
}

// ─── ROTA /api/gemini ─────────────────────────────────────────────────────────
app.post('/api/gemini', async (req, res) => {
  const { message, context } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
  if (!message) return res.status(400).json({ error: 'Mensagem não enviada' });

  const systemPrompt = `Você é o FORJA, um técnico de voleibol com mais de 40 anos de experiência profissional.
PERSONALIDADE: Sarcástico na medida certa, extremamente confiante, direto e sem rodeios, desafiador.
REGRAS: Foco total em voleibol. Respostas práticas e diretas.`;

  let fullPrompt = systemPrompt;
  if (context) fullPrompt += `\n\nDados do sistema:\n${JSON.stringify(context, null, 2)}`;
  fullPrompt += `\n\nTreinador: ${message}\nFORJA:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }) }
    );
    const data: any = await response.json();
    if (!response.ok) return res.status(500).json({ error: data?.error?.message || 'Erro na API do Gemini' });
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || null;
    if (!text) return res.status(500).json({ error: 'Sem resposta da IA' });
    return res.json({ text });
  } catch (e) {
    console.error('api/gemini error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno' });
  }
});

// ─── ROTA AI COACH ────────────────────────────────────────────────────────────
app.post('/api/ai-coach', async (req, res) => {
  const { messages, context } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });

  let conversationText = '';
  if (context) conversationText += `Dados do sistema:\n${JSON.stringify(context, null, 2)}\n\n`;
  if (messages?.length > 0) {
    for (const msg of messages) {
      conversationText += `${msg.role === 'user' ? 'Treinador' : 'FORJA'}: ${msg.content}\n`;
    }
    conversationText += 'FORJA:';
  }

  try {
    const text = await chamarIA('TREINADOR', conversationText);
    return res.json({ text });
  } catch (e) {
    console.error('ai-coach error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

// ─── BACKUP ROUTES (via Supabase REST API server-side) ────────────────────────

// POST /api/backup/save — salvar backup
app.post('/api/backup/save', async (req, res) => {
  if (!isSupabaseReady()) return res.status(503).json({ error: 'Supabase não configurado no servidor.' });

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Dados do backup ausentes.' });

  const name = `FORJA — ${new Date().toLocaleString('pt-BR')}`;
  const payload = { name, data: typeof data === 'string' ? data : JSON.stringify(data) };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/backups`, {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    if (!response.ok) {
      console.error('[backup/save] Supabase error:', response.status, result);
      return res.status(500).json({ error: 'Erro ao salvar backup.', detail: result });
    }

    return res.json({ success: true, backup: JSON.parse(result)?.[0] || null });
  } catch (e) {
    console.error('[backup/save] error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno' });
  }
});

// GET /api/backup/list — listar backups
app.get('/api/backup/list', async (_req, res) => {
  if (!isSupabaseReady()) return res.status(503).json({ error: 'Supabase não configurado no servidor.' });

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/backups?select=*`,
      { headers: supabaseHeaders() }
    );

    const result = await response.text();
    if (!response.ok) {
      console.log('[backup/list] Supabase error:', response.status, result);
      return res.status(500).json({ error: 'Erro ao listar backups.', detail: result });
    }

    const rows: any[] = JSON.parse(result);
    // sort by whichever timestamp column exists, newest first
    rows.sort((a, b) => {
      const da = a.Created_at || a.created_at || a.createdAt || '';
      const db = b.Created_at || b.created_at || b.createdAt || '';
      return db.localeCompare(da);
    });
    return res.json(rows);
  } catch (e) {
    console.error('[backup/list] error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno' });
  }
});

// GET /api/backup/load/:id — carregar backup
app.get('/api/backup/load/:id', async (req, res) => {
  if (!isSupabaseReady()) return res.status(503).json({ error: 'Supabase não configurado no servidor.' });

  const { id } = req.params;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/backups?id=eq.${id}&select=id,name,data,Created_at`,
      { headers: { ...supabaseHeaders(), 'Accept': 'application/vnd.pgrst.object+json' } }
    );

    const result = await response.text();
    if (!response.ok) {
      console.error('[backup/load] Supabase error:', response.status, result);
      return res.status(500).json({ error: 'Erro ao carregar backup.', detail: result });
    }

    const backup = JSON.parse(result);
    if (!backup?.data) return res.status(404).json({ error: 'Backup não encontrado.' });

    return res.json(backup);
  } catch (e) {
    console.error('[backup/load] error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno' });
  }
});

// DELETE /api/backup/delete/:id — excluir backup
app.delete('/api/backup/delete/:id', async (req, res) => {
  if (!isSupabaseReady()) return res.status(503).json({ error: 'Supabase não configurado no servidor.' });

  const { id } = req.params;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/backups?id=eq.${id}`, {
      method: 'DELETE',
      headers: supabaseHeaders(),
    });

    if (!response.ok) {
      const result = await response.text();
      console.error('[backup/delete] Supabase error:', response.status, result);
      return res.status(500).json({ error: 'Erro ao excluir backup.', detail: result });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[backup/delete] error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno' });
  }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[FORJA] Servidor rodando na porta ${PORT}`);
  console.log(`[FORJA] Supabase backup: ${isSupabaseReady() ? 'configurado ✓' : 'não configurado'}`);
});
