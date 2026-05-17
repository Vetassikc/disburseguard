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
  const receiptsByType = new Map(paidReceipts.map((receipt) => [receipt.evidenceType, receipt]));
  const vendorProof = receiptsByType.get("vendor-risk");
  const recipientProof = receiptsByType.get("recipient-match");
  const sanctionsProof = receiptsByType.get("sanctions-screen");
  const deliveryProof = receiptsByType.get("delivery-attestation");
  const recipientMatches = intent.recipientAccountFingerprint === intent.expectedRecipientAccountFingerprint;
  const freshPaidReceipts = paidReceipts.filter((receipt) => !receipt.stale);
  const bestProofConfidence = Math.max(0, ...freshPaidReceipts.map((receipt) => receipt.confidence));
  const requiredProofAvailable = Boolean(vendorProof && recipientProof && sanctionsProof);
  const deliveryIsUsable = Boolean(deliveryProof && !deliveryProof.stale && deliveryProof.confidence >= 0.65);
  const proofMeetsReviewFloor = requiredProofAvailable && bestProofConfidence >= 0.65 && deliveryIsUsable;
  const proofIsStrong = requiredProofAvailable && deliveryIsUsable && paidReceipts.every((receipt) => receipt.confidence >= 0.85 && !receipt.stale);
  const highValue = intent.amount > LIMIT_APPROVED_AMOUNT;
  const sanctionsSummary = sanctionsProof?.summary.toLowerCase() ?? "";
  const sanctionsHit = sanctionsSummary.includes("hit") && !sanctionsSummary.includes("no sanctions");

  const checks: PolicyDecision["checks"] = [
    {
      label: "Vendor risk proof",
      status: vendorProof && !vendorProof.stale && vendorProof.confidence >= 0.85 ? "pass" : vendorProof ? "warn" : "fail",
      detail: vendorProof
        ? `${vendorProof.summary} Confidence ${vendorProof.confidence.toFixed(2)}.`
        : "No paid vendor-risk proof receipt is available.",
    },
    {
      label: "Recipient match",
      status: recipientMatches && recipientProof ? "pass" : recipientMatches ? "warn" : "fail",
      detail: recipientMatches && recipientProof
        ? "Invoice recipient matches the verified vendor record."
        : recipientMatches
          ? "Recipient fingerprints match, but the paid recipient proof is missing."
          : "Invoice recipient differs from the verified vendor record.",
    },
    {
      label: "Sanctions screen",
      status: sanctionsHit ? "fail" : sanctionsProof ? "pass" : "fail",
      detail: sanctionsProof ? sanctionsProof.summary : "No paid sanctions-screen proof receipt is available.",
    },
    {
      label: "Delivery attestation",
      status: deliveryProof && !deliveryProof.stale && deliveryProof.confidence >= 0.85 ? "pass" : deliveryProof && !deliveryProof.stale ? "warn" : "fail",
      detail: deliveryProof
        ? `${deliveryProof.summary} Confidence ${deliveryProof.confidence.toFixed(2)}.`
        : "No paid delivery-attestation proof receipt is available.",
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

  if (intent.riskProfile === "high" || extraction.fields.vendorRisk === "high" || sanctionsHit) {
    return {
      decision: "BLOCK",
      approvedAmount: 0,
      currency: intent.currency,
      policyVersion: POLICY_VERSION,
      reasons: [sanctionsHit ? "Sanctions or watchlist proof produced a critical hit." : "Vendor risk is high under treasury-policy-v1."],
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
