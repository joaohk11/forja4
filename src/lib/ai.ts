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
    // pega a última mensagem do usuário
    const lastMessage = messages[messages.length - 1]?.content || '';

    const resp = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: lastMessage,
        context,
      }),
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

    // efeito de digitação (UX melhor)
    const words = data.text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      onDelta(chunk);

      if (i % 8 === 0) {
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    onDone();
  } catch (e) {
    onError?.(e instanceof Error ? e.message : 'Erro de conexão');
    onDone();
  }
}
