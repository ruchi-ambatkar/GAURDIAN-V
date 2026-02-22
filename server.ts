import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/verify", async (req, res) => {
    const { documentImage, documentType, contextData } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API Key not configured" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // 1. Vision Analysis (VLM)
      const visionResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              { text: `Analyze this ${documentType} for micro-inconsistencies in font kerning, logo resolution, and stamp alignment. Look for traces of AI-inpainting or digital overlays. Output a JSON object with 'confidence' (0-1), 'anomalies' (array), and 'isAuthentic' (boolean).` },
              { inlineData: { mimeType: "image/jpeg", data: documentImage.split(',')[1] } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const visionResult = JSON.parse(visionResponse.text || "{}");

      // 2. Logic Validation (Reasoning)
      const logicResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Validate the narrative consistency for this document. Context: ${JSON.stringify(contextData)}. Document Data: ${JSON.stringify(visionResult)}. Check for cross-document discrepancies. Output JSON with 'logicScore' (0-1) and 'discrepancies' (array).`,
        config: { responseMimeType: "application/json" }
      });

      const logicResult = JSON.parse(logicResponse.text || "{}");

      // 3. Final Orchestration
      const finalConfidence = (visionResult.confidence + logicResult.logicScore) / 2;
      
      res.json({
        id: Math.random().toString(36).substr(2, 9),
        status: finalConfidence > 0.85 ? "VERIFIED" : (finalConfidence > 0.6 ? "PENDING_HITL" : "REJECTED"),
        confidence: finalConfidence,
        vision: visionResult,
        logic: logicResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Guardian-V Server running on http://localhost:${PORT}`);
  });
}

startServer();
