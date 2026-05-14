import { GoogleGenAI } from "@google/genai";

import { extractionResultSchema, type ExtractionResult, type PayoutIntent } from "./contracts";
import { getPayoutFixture } from "./fixtures";

export async function extractPayoutContext(intent: PayoutIntent): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const useLiveGemini = process.env.NODE_ENV !== "test" && process.env.GEMINI_MODE === "live" && Boolean(apiKey);

  if (!useLiveGemini || !apiKey) {
    return getPayoutFixture(intent.scenarioId).extraction;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: [
        "Extract payout context as JSON matching DisburseGuard's extraction schema.",
        "Return only JSON. Do not decide policy.",
        intent.documentText,
      ].join("\n\n"),
      config: {
        responseMimeType: "application/json",
      },
    });
    const parsed = extractionResultSchema.parse(JSON.parse(response.text ?? "{}"));
    return { ...parsed, mode: "live-gemini" };
  } catch {
    return {
      ...getPayoutFixture(intent.scenarioId).extraction,
      warnings: [...getPayoutFixture(intent.scenarioId).extraction.warnings, "Live Gemini extraction failed; fixture fallback used."],
    };
  }
}
