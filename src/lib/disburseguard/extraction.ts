import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { extractionResultSchema, type ExtractionResult, type PayoutIntent } from "./contracts";
import { getPayoutFixture } from "./fixtures";

const liveExtractionPayloadSchema = z.object({
  confidence: z.number().min(0).max(1),
  fields: z.object({
    vendorName: z.string(),
    invoiceId: z.string(),
    amount: z.number(),
    currency: z.string(),
    recipientName: z.string(),
    recipientAccountFingerprint: z.string(),
    paymentPurpose: z.string(),
    vendorRisk: z.enum(["low", "medium", "high"]),
  }),
  sourceSnippets: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});

export async function extractPayoutContext(intent: PayoutIntent): Promise<ExtractionResult> {
  if (process.env.NODE_ENV === "test") {
    return getPayoutFixture(intent.scenarioId).extraction;
  }

  if (process.env.GEMINI_MODE === "live" && process.env.GEMINI_API_KEY) {
    return extractWithGoogleGemini(intent);
  }

  if (process.env.GEMINI_MODE === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return extractWithOpenRouterGemini(intent);
  }

  return getPayoutFixture(intent.scenarioId).extraction;
}

async function extractWithGoogleGemini(intent: PayoutIntent): Promise<ExtractionResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: buildExtractionPrompt(intent),
      config: {
        responseMimeType: "application/json",
      },
    });
    return normalizeLiveExtraction(response.text ?? "{}", "live-gemini", process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  } catch {
    return extractionFallback(intent, "Live Gemini extraction failed; fixture fallback used.");
  }
}

async function extractWithOpenRouterGemini(intent: PayoutIntent): Promise<ExtractionResult> {
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "http-referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "x-title": process.env.OPENROUTER_APP_TITLE ?? "DisburseGuard",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: buildExtractionPrompt(intent),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with ${response.status}`);
    }

    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return normalizeLiveExtraction(body.choices?.[0]?.message?.content ?? "{}", "openrouter-gemini", model);
  } catch {
    return extractionFallback(intent, "OpenRouter Gemini extraction failed; fixture fallback used.");
  }
}

function buildExtractionPrompt(intent: PayoutIntent) {
  return [
    "Extract payout context from the invoice text.",
    "Return only JSON with exactly these top-level fields: confidence, fields, sourceSnippets, warnings.",
    "fields must contain: vendorName, invoiceId, amount, currency, recipientName, recipientAccountFingerprint, paymentPurpose, vendorRisk.",
    "vendorRisk must be one of: low, medium, high.",
    "Do not decide policy and do not include markdown.",
    "",
    intent.documentText,
  ].join("\n");
}

function normalizeLiveExtraction(rawJson: string, mode: "live-gemini" | "openrouter-gemini", model: string): ExtractionResult {
  const parsed = liveExtractionPayloadSchema.parse(JSON.parse(rawJson));

  return extractionResultSchema.parse({
    ...parsed,
    mode,
    model,
  });
}

function extractionFallback(intent: PayoutIntent, warning: string): ExtractionResult {
  const fixture = getPayoutFixture(intent.scenarioId).extraction;

  return {
    ...fixture,
    warnings: [...fixture.warnings, warning],
  };
}
