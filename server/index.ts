import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── POSTGRESQL POOL (Replit cloud DB) ───────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

// ─── BACKUP ROUTES (PostgreSQL cloud DB) ─────────────────────────────────────

// POST /api/backup/save
app.post('/api/backup/save', async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Dados do backup ausentes.' });

  const name = `FORJA — ${new Date().toLocaleString('pt-BR')}`;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  try {
    const result = await pool.query(
      'INSERT INTO backups (name, data) VALUES ($1, $2) RETURNING id, name, created_at',
      [name, payload]
    );
    return res.json({ success: true, backup: result.rows[0] });
  } catch (e) {
    console.error('[backup/save]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao salvar backup.' });
  }
});

// GET /api/backup/list
app.get('/api/backup/list', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM backups ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (e) {
    console.error('[backup/list]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar backups.' });
  }
});

// GET /api/backup/load/:id
app.get('/api/backup/load/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name, data, created_at FROM backups WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Backup não encontrado.' });
    return res.json(result.rows[0]);
  } catch (e) {
    console.error('[backup/load]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao carregar backup.' });
  }
});

// DELETE /api/backup/delete/:id
app.delete('/api/backup/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM backups WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (e) {
    console.error('[backup/delete]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao excluir backup.' });
  }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[FORJA] Servidor rodando na porta ${PORT}`);
  console.log(`[FORJA] Backup na nuvem: PostgreSQL configurado ✓`);
});
