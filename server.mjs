
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options(/.*/, cors());

app.use(express.json({ limit: "100kb" }));

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Nenhuma mensagem enviada."
      });
    }

    const historico = messages.slice(-16).map(msg => {
      if (!["user", "assistant"].includes(msg.role)) {
        throw new Error("Papel de mensagem inválido.");
      }

      if (typeof msg.content !== "string" || msg.content.length > 4000) {
        throw new Error("Mensagem inválida.");
      }

      return {
        role: msg.role,
        content: msg.content
      };
    });

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.5",
          instructions: `Você é o assistente de acolhimento do site Encontro de Superações.

Responda sempre em português brasileiro.

Seja empático, gentil, paciente e compreensivo.
Escute sem julgar.
Ofereça palavras de apoio e conselhos cuidadosos.
Não seja frio ou excessivamente formal.
Não incentive autolesão.

Se alguém estiver em perigo imediato ou pensando em se machucar, incentive a procurar alguém de confiança e ajuda urgente.

No Brasil, indique o CVV 188 e, em emergências, o SAMU 192.

Lembre-se de que você é um assistente virtual e não substitui acompanhamento profissional.`,
          input: historico,
          max_output_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro da OpenAI:", data);

      return res.status(response.status).json({
        error: data.error?.message || "Erro na API da OpenAI."
      });
    }

    const answer = data.output_text?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "A OpenAI não retornou uma resposta."
      });
    }

    res.json({ answer });

  } catch (error) {
    console.error("Erro no servidor:", error);

    res.status(500).json({
      error: "Não foi possível processar sua mensagem."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor OpenAI funcionando na porta ${PORT}`);
});
