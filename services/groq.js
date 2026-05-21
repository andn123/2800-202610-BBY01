const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_STACK = [
  "openai/gpt-oss-120b",
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
];

async function chatWithFallback(messages) {
  for (const model of MODEL_STACK) {
    try {
      const response = await groq.chat.completions.create({ model, messages });
      return response.choices[0].message.content;
    } catch (err) {
      if (err.status !== 429) throw err;
    }
  }
  throw new Error("RATE_LIMITED");
}

async function chatWithModel(model, messages, temperature = 1) {
  const response = await groq.chat.completions.create({
    model,
    messages,
    temperature,
  });
  return response.choices[0].message.content;
}

module.exports = { chatWithFallback, chatWithModel };
