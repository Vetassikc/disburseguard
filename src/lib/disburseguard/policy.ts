import type { ExtractionResult, PayoutIntent, PolicyDecision, ProofReceipt } from "./contracts";

export const POLICY_VERSION = "treasury-policy-v1" as const;
export const LIMIT_APPROVED_AMOUNT = 25000;

type DecidePolicyInput = {
  intent: PayoutIntent;
  extraction: ExtractionResult;
  proofReceipts: ProofReceipt[];
};

export function decidePolicy({ intent, extraction, proofReceipts }: DecidePolicyInput): PolicyDecision {
  const paidReceipts = proofReceipts.filter((receipt) => receipt.paymentStatus === "paid" || receipt.paymentStatus === "fallback-paid");
  const freshPaidReceipts = paidReceipts.filter((receipt) => !receipt.stale);
  const bestProofConfidence = Math.max(0, ...freshPaidReceipts.map((receipt) => receipt.confidence));
  const recipientMatches = intent.recipientAccountFingerprint === intent.expectedRecipientAccountFingerprint;
  const hasPaidProof = freshPaidReceipts.length > 0;
  const proofMeetsReviewFloor = hasPaidProof && bestProofConfidence >= 0.65;
  const proofIsStrong = hasPaidProof && bestProofConfidence >= 0.85;
  const highValue = intent.amount > LIMIT_APPROVED_AMOUNT;

  const checks: PolicyDecision["checks"] = [
    {
      label: "Recipient match",
      status: recipientMatches ? "pass" : "fail",
      detail: recipientMatches
        ? "Invoice recipient matches the verified vendor record."
        : "Invoice recipient differs from the verified vendor record.",
    },
    {
      label: "Paid proof",
      status: proofIsStrong ? "pass" : proofMeetsReviewFloor ? "warn" : "fail",
      detail: hasPaidProof
        ? `Best fresh paid proof confidence is ${bestProofConfidence.toFixed(2)}.`
        : "No fresh paid proof receipt is available.",
    },
    {
      label: "Extraction confidence",
      status: extraction.confidence >= 0.9 ? "pass" : extraction.confidence >= 0.65 ? "warn" : "fail",
      detail: `Structured extraction confidence is ${extraction.confidence.toFixed(2)}.`,
    },
    {
      label: "Capital exposure",
      status: highValue ? "warn" : "pass",
      detail: highValue
        ? `Requested amount exceeds the ${LIMIT_APPROVED_AMOUNT} policy cap for partial proof.`
        : "Requested amount is within the automatic release threshold.",
    },
  ];

  if (!recipientMatches) {
    return {
      decision: "BLOCK",
      approvedAmount: 0,
      currency: intent.currency,
      policyVersion: POLICY_VERSION,
      reasons: ["Recipient account does not match the verified vendor record."],
      checks,
    };
  }

  if (intent.riskProfile === "high" || extraction.fields.vendorRisk === "high") {
    return {
      decision: "BLOCK",
      approvedAmount: 0,
      currency: intent.currency,
      policyVersion: POLICY_VERSION,
      reasons: ["Vendor risk is high under treasury-policy-v1."],
      checks,
    };
  }

  if (!proofMeetsReviewFloor || extraction.confidence < 0.65) {
    return {
      decision: "REVIEW",
      approvedAmount: 0,
      currency: intent.currency,
      policyVersion: POLICY_VERSION,
      reasons: ["Required paid proof is missing, stale, or below confidence threshold."],
      checks,
    };
  }

  if (highValue || !proofIsStrong || extraction.confidence < 0.9) {
    return {
      decision: "LIMIT",
      approvedAmount: Math.min(intent.amount, LIMIT_APPROVED_AMOUNT),
      currency: intent.currency,
      policyVersion: POLICY_VERSION,
      reasons: ["High-value payout requires capped release until proof quality improves."],
      checks,
    };
  }

  return {
    decision: "CLEAR",
    approvedAmount: intent.amount,
    currency: intent.currency,
    policyVersion: POLICY_VERSION,
    reasons: ["Verified vendor and paid proof satisfy release policy."],
    checks,
  };
}
