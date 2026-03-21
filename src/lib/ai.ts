// AI helper for the FORJA app — powered by Google Gemini via server
const AI_URL = '/api/ai-coach';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamAI({
  messages,
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: AIMessage[];
  context?: Record<string, unknown>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}) {
  try {
    const resp = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });

    let data: { text?: string; error?: string };
    try {
      data = await resp.json();
    } catch {
      onError?.(`Erro ${resp.status}: resposta inválida do servidor`);
      onDone();
      return;
    }

    if (!resp.ok) {
      onError?.(data.error || `Erro ${resp.status}`);
      onDone();
      return;
    }

    if (!data.text) {
      onError?.('Sem resposta da IA');
      onDone();
      return;
    }

    // Simulate progressive rendering word-by-word for better UX
    const words = data.text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      onDelta(chunk);
      // Tiny pause every 8 words so it feels live
      if (i % 8 === 0) await new Promise(r => setTimeout(r, 20));
    }

    onDone();
  } catch (e) {
    onError?.(e instanceof Error ? e.message : 'Erro de conexão');
    onDone();
  }
}
