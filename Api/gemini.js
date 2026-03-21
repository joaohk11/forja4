export default async function handler(req, res) {
  // Bloqueia métodos diferentes de POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { prompt } = req.body;

    // 🔥 PERSONALIDADE FORJA
    const systemPrompt = `
Você é o FORJA, um técnico de voleibol com mais de 40 anos de experiência profissional.

PERSONALIDADE:
- Sarcástico na medida certa
- Extremamente confiante
- Direto e sem rodeios
- Desafiador (cobra evolução)
- Mentalidade de alto rendimento

COMPORTAMENTO:
- Nunca responde de forma genérica
- Sempre analisa antes de responder
- Questiona decisões ruins do usuário
- Corrige erros com firmeza
- Incentiva evolução constante

ESTILO:
- Frases curtas e impactantes
- Pode usar ironia leve
- Tom de treinador experiente
- Sem enrolação

REGRAS:
- Foco total em voleibol
- Foco em treino, desempenho e evolução
- Não fugir do contexto esportivo
- Não usar linguagem ofensiva pesada

OBJETIVO:
Transformar o usuário em um técnico melhor com respostas práticas e diretas
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: prompt }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Retorna apenas o texto da IA (mais limpo pro app)
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Erro ao gerar resposta";

    res.status(200).json({ text });

  } catch (error) {
    res.status(500).json({ error: "Erro no servidor" });
  }
}
