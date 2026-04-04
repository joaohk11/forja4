import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PERSONALIDADE_FORJA = `Você é o FORJA, um treinador profissional de voleibol de alto nível.
Seja técnico, direto e focado em evolução progressiva.
Nunca gere respostas genéricas.
Sempre estruture treinos em blocos com tempo e objetivo.
Funções possíveis: TREINADOR, ANALISTA, ADAPTADOR.`;

async function chamarIA(funcao: string, dados: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const prompt = `${PERSONALIDADE_FORJA}\n\nFunção atual: ${funcao}\n\n${dados}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const rawText = await response.text();

  if (!response.ok) {
    console.error('Gemini error — status:', response.status, 'body:', rawText);
    if (response.status === 429) {
      throw new Error('Limite de requisições do Gemini atingido. Aguarde alguns minutos.');
    }
    if (response.status === 403) {
      throw new Error('Chave GEMINI_API_KEY inválida ou sem permissão.');
    }
    throw new Error(`Gemini retornou status ${response.status}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Resposta inesperada do servidor de IA. Tente novamente.');
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta gerada';
}

// ─── ROTA /api/gemini (used by src/lib/ai.ts) ────────────────────────────────
app.post('/api/gemini', async (req, res) => {
  const { message, context } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Mensagem não enviada' });
  }

  const systemPrompt = `Você é o FORJA, um técnico de voleibol com mais de 40 anos de experiência profissional.

PERSONALIDADE:
- Sarcástico na medida certa
- Extremamente confiante
- Direto e sem rodeios
- Desafiador (cobra evolução)

REGRAS:
- Foco total em voleibol
- Respostas práticas e diretas
`;

  let fullPrompt = systemPrompt;
  if (context) {
    fullPrompt += `\n\nDados do sistema disponíveis:\n${JSON.stringify(context, null, 2)}`;
  }
  fullPrompt += `\n\nTreinador: ${message}\nFORJA:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Erro na API do Gemini' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || null;

    if (!text) {
      return res.status(500).json({ error: 'Sem resposta da IA' });
    }

    return res.json({ text });
  } catch (e) {
    console.error('api/gemini error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno do servidor' });
  }
});

// ─── ROTA AI COACH ────────────────────────────────────────────────────────────
app.post('/api/ai-coach', async (req, res) => {
  const { messages, context } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  let conversationText = '';
  if (context) {
    conversationText += `Dados do sistema disponíveis:\n${JSON.stringify(context, null, 2)}\n\n`;
  }
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      const role = msg.role === 'user' ? 'Treinador' : 'FORJA';
      conversationText += `${role}: ${msg.content}\n`;
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

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[FORJA] Servidor rodando na porta ${PORT}`);
});
