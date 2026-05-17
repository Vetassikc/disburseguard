import type { ExtractionResult, PayoutIntent, ProofPlan } from "./contracts";

const proofSteps = [
  ["vendor-risk", 0.08, "Vendor identity and risk must be checked before treasury release."],
  ["recipient-match", 0.07, "Invoice recipient must match the verified vendor payment account."],
  ["sanctions-screen", 0.11, "Sanctions and watchlist proof is mandatory for automated payout decisions."],
  ["delivery-attestation", 0.09, "Delivery or milestone proof is required before full release."],
] as const;

export function createProofPlan(clearanceId: string, intent: PayoutIntent, extraction: ExtractionResult): ProofPlan {
  return {
    id: `plan_${clearanceId}`,
    clearanceId,
    generatedBy: "Proof Agent",
    mode: extraction.mode,
    steps: proofSteps.map(([evidenceType, quotedCostUsd, reason]) => ({
      provider: `DisburseGuard ${evidenceType} Proof`,
      evidenceType,
      x402Resource: `/api/proofs/${evidenceType}?vendor=${encodeURIComponent(intent.vendorId)}`,
      quotedCostUsd: evidenceType === "vendor-risk" && intent.amount > 50000 ? 0.12 : quotedCostUsd,
      required: true,
      reason,
    })),
  };
}
