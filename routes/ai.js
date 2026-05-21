const express = require("express");
const router = express.Router();
const { chatWithFallback, chatWithModel } = require("../services/groq");

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "Message required" });
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await chatWithFallback(formattedMessages);
    res.json({ reply });
  } catch (err) {
    if (err.message === "RATE_LIMITED") {
      return res.status(429).json({
        error:
          "All available models are currently rate-limited. Please try again shortly.",
      });
    }
    console.error("Chat error:", err);
    res
      .status(500)
      .json({ error: "Chat request failed", details: err.message });
  }
});

router.post("/shadeAI", async (req, res) => {
  try {
    const { messages, promptType } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "Message required" });
    }

    const serverPrompts = {
      tree: {
        role: "system",
        content: `
          Write 2-3 sentence description based on given tree information. Focus on explaining 
          how a given tree can contribute to shade. Build description from its common name,
          and scientific name, then use species trait like leaves and brancing pattern to explain
          if it can provide useful shade. Plain text only, no markdown, and maximum 45 words.
        `,
      },
      spot: {
        role: "system",
        content: `
          Write a 2-3 sentence description based on given information for a spot in a park. Focus 
          on the possible shade from number of trees. Plain text only, no markdown, 
          and maximum 45 words. Do not mention radius, tree characteristics, or buildings. Refrain from 
          mentioning downsides. In the user request, the values for number of trees, number of benches, 
          and number of picnic table are category labels: none=0, low=1-2, medium=3-5, high=6+. If none, say
          0 instead of low.
        `,
      },
    };

    const serverPrompt = serverPrompts[promptType];

    const reply = await chatWithModel(
      "llama-3.1-8b-instant",
      [
        serverPrompt,
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      0.5,
    );

    res.json({ reply });
  } catch (err) {
    console.error("ShadeAI error:", err);
    res
      .status(500)
      .json({ error: "ShadeAI request failed", details: err.message });
  }
});

module.exports = router;
