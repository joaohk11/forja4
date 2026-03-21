import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem não enviada' });
    }

    const systemPrompt = `
Você é o FORJA, um técnico de voleibol com mais de 40 anos de experiência profissional.

PERSONALIDADE:
- Sarcástico na medida certa
- Extremamente confiante
- Direto e sem rodeios
- Desafiador (cobra evolução)

REGRAS:
- Foco total em voleibol
- Respostas práticas e diretas
`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API KEY não configurada' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: message },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

if (!response.ok) {
  return res.status(500).json({
    error: data?.error?.message || "Erro na API do Gemini",
  });
}

const text =
  data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ||
  null;

if (!text) {
  return res.status(500).json({
    error: "Sem resposta da IA",
    raw: data, // 🔥 te ajuda a debuggar
  });
}

res.status(200).json({ text });

  } catch (error) {
    console.error('ERRO GEMINI:', error);

    return res.status(500).json({
      error: 'Erro interno do servidor',
    });
  }
}
