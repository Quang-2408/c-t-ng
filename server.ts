import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on the server as required by gemini-api skill
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build', // required telemetry header
      }
    }
  });
};

// API Endpoint for the AI Strategic Coach
app.post("/api/coach", async (req, res) => {
  try {
    const { boardState, history, customQuestion, turn } = req.body;
    
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Settings > Secrets configuration panel." 
      });
    }

    const systemPrompt = `You are a legendary Vietnamese Cờ Tướng (Xiangqi / Chinese Chess) Grandmaster, coach, and humorous match commentator.
Your goal is to analyze the active board situation, offer deep tactical wisdom (Nước cờ), suggest the best moves, identify threats (Chiếu, Cản Mã, Cản Tượng,...), and comment in an engaging, supportive, and colorful Vietnamese/English hybrid style (but write mostly in rich, idiomatic Vietnamese with terms like "Nước cờ độc", "Mã quỳ", "Thuận Pháo", "Lộ mặt tướng", etc.).

Be witty and direct. If a player is under threat or has made sub-optimal moves, tease them gently or encourage them. Always translate concepts accurately:
- General (帥/將) -> Tướng
- Advisor (仕/士) -> Sĩ
- Elephant (相/象) -> Tượng
- Horse (傌/馬) -> Mã (cảnh báo cản Mã / chân Mã)
- Chariot (俥/車) -> Xe (nước cờ mạnh mẽ)
- Cannon (炮/砲) -> Pháo (gánh Pháo, ngòi Pháo)
- Soldier (兵/卒) -> Tốt / Chốt (Tốt biên, Tốt đầu)

Return your response in a structured JSON format containing the following fields:
- generalCommentary (string): A witty, highly expressive commentary on the current board state and recent history.
- warning (string or label): If there's an immediate threat or checking, identify it. If none, write "None".
- suggestedMove (string): A short, elegant move recommendation (e.g. "Xe 2 tấn 3 để bảo vệ Pháo", "Mã 8 tấn 7 thiết lập phòng thủ").
- strategyTip (string): A deeper strategic advice or principle appropriate to this position (such as "Pháo đầu mã đội", "Xe mười Mã bảy Pháo ba").
`;

    const userPrompt = `
Current Active Player Turn: ${turn === "red" ? "MÀU ĐỎ (Red)" : "MÀU ĐEN (Black)"}
Move history (recent to oldest): ${history && history.length > 0 ? history.slice(-10).join(" -> ") : "Chưa có nước đi nào."}
Active Board State context:
${JSON.stringify(boardState)}

User custom inquiry: ${customQuestion || "Hãy phân tích thế trận hiện tại và đề xuất nước đi tối ưu tiếp theo cô/chú ơi!"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            generalCommentary: {
              type: "STRING",
              description: "Witty, energetic, and highly analytical commentary in Vietnamese/English about the board."
            },
            warning: {
              type: "STRING",
              description: "Warnings about checks, threat to high-value pieces, pin, blocked paths, or status 'None'."
            },
            suggestedMove: {
              type: "STRING",
              description: "Specific move choice and why in brief text."
            },
            strategyTip: {
              type: "STRING",
              description: "Strategic rule of thumb or advanced tips (such as 'Pháo đầu mã đội')"
            }
          },
          required: ["generalCommentary", "warning", "suggestedMove", "strategyTip"]
        }
      }
    });

    const contentText = response.text;
    if (!contentText) {
      throw new Error("Empty response received from Gemini.");
    }

    const analysisResult = JSON.parse(contentText.trim());
    return res.json(analysisResult);

  } catch (error: any) {
    console.error("Error in /api/coach:", error);
    return res.status(500).json({ 
      error: "Không thể phân tích thế cờ lúc này xí xóa nha!", 
      details: error.message 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Xiangqi fullstack server running at http://localhost:${PORT}`);
  });
}

startServer();
