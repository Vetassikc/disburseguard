import type { ExtractionResult, PayoutIntent, ProofPlan } from "./contracts";

export function createProofPlan(clearanceId: string, intent: PayoutIntent, extraction: ExtractionResult): ProofPlan {
  return {
    id: `plan_${clearanceId}`,
    clearanceId,
    generatedBy: "Proof Agent",
    mode: extraction.mode,
    steps: [
      {
        provider: "DisburseGuard Vendor Proof",
        evidenceType: "vendor-risk",
        x402Resource: `/api/proofs/vendor-risk?vendor=${encodeURIComponent(intent.vendorId)}`,
        quotedCostUsd: intent.amount > 50000 ? 0.12 : 0.08,
        required: true,
        reason: "Vendor identity, recipient fingerprint, and proof freshness are required before treasury release.",
      },
    ],
  };
}
