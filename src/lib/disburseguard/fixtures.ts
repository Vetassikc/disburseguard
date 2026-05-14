import type { ExtractionResult, PayoutIntent, PolicyDecision, ProofReceipt, ScenarioId } from "./contracts";
import { hashObject } from "./hashing";

type PayoutFixture = {
  intent: PayoutIntent;
  extraction: ExtractionResult;
  proofReceipts: ProofReceipt[];
  policyDecision: PolicyDecision;
};

const createdAt = "2026-05-13T16:00:00.000Z";

function makeReceipt(input: Omit<ProofReceipt, "id" | "receiptHash" | "evidenceHash">): ProofReceipt {
  const evidenceHash = hashObject({
    provider: input.provider,
    evidenceType: input.evidenceType,
    source: input.source,
    summary: input.summary,
    confidence: input.confidence,
    stale: input.stale,
  });
  const id = `pr_${evidenceHash.slice(0, 12)}`;
  const receiptHash = hashObject({ ...input, id, evidenceHash });

  return { ...input, id, evidenceHash, receiptHash };
}

function makeIntent(input: Omit<PayoutIntent, "documentText">): PayoutIntent {
  return {
    ...input,
    documentText: [
      `Invoice ${input.invoiceId} requests ${input.currency} ${input.amount} for ${input.vendorName}.`,
      `Recipient ${input.recipientName} has account fingerprint ${input.recipientAccountFingerprint}.`,
      `Purpose: ${input.paymentPurpose}.`,
    ].join("\n"),
  };
}

function makeExtraction(intent: PayoutIntent, confidence: number, warnings: string[] = []): ExtractionResult {
  return {
    mode: "fixture-fallback",
    model: "gemini-fixture-recording",
    confidence,
    fields: {
      vendorName: intent.vendorName,
      invoiceId: intent.invoiceId,
      amount: intent.amount,
      currency: intent.currency,
      recipientName: intent.recipientName,
      recipientAccountFingerprint: intent.recipientAccountFingerprint,
      paymentPurpose: intent.paymentPurpose,
      vendorRisk: intent.riskProfile,
    },
    sourceSnippets: [
      `Invoice ${intent.invoiceId} lists ${intent.vendorName} as vendor.`,
      `Payment purpose extracted as ${intent.paymentPurpose}.`,
    ],
    warnings,
  };
}

function makePolicyDecision(
  decision: PolicyDecision["decision"],
  approvedAmount: number,
  currency: string,
  reasons: string[],
): PolicyDecision {
  return {
    decision,
    approvedAmount,
    currency,
    policyVersion: "treasury-policy-v1",
    reasons,
    checks: [],
  };
}

const intents: Record<ScenarioId, PayoutIntent> = {
  clear: makeIntent({
    id: "pi_clear_milan_gridworks",
    scenarioId: "clear",
    vendorName: "Milan Gridworks SRL",
    vendorId: "vendor_milan_gridworks",
    amount: 18400,
    currency: "USD",
    recipientName: "Milan Gridworks SRL Operating",
    recipientAccountFingerprint: "acct_8f14_verified",
    expectedRecipientAccountFingerprint: "acct_8f14_verified",
    requester: "treasury.ops@disburseguard.example",
    invoiceId: "INV-MGW-2026-041",
    dueDate: "2026-05-20",
    paymentPurpose: "Grid resilience consulting milestone",
    riskProfile: "low",
  }),
  limit: makeIntent({
    id: "pi_limit_alpine_quantum",
    scenarioId: "limit",
    vendorName: "Alpine Quantum Components AG",
    vendorId: "vendor_alpine_quantum",
    amount: 75000,
    currency: "USD",
    recipientName: "Alpine Quantum Components AG",
    recipientAccountFingerprint: "acct_52ad_partial",
    expectedRecipientAccountFingerprint: "acct_52ad_partial",
    requester: "treasury.ops@disburseguard.example",
    invoiceId: "INV-AQC-2026-118",
    dueDate: "2026-05-18",
    paymentPurpose: "Specialized inference hardware reserve",
    riskProfile: "medium",
  }),
  review: makeIntent({
    id: "pi_review_lagoon_research",
    scenarioId: "review",
    vendorName: "Lagoon Research Cooperative",
    vendorId: "vendor_lagoon_research",
    amount: 22100,
    currency: "USD",
    recipientName: "Lagoon Research Cooperative",
    recipientAccountFingerprint: "acct_77bb_unconfirmed",
    expectedRecipientAccountFingerprint: "acct_77bb_unconfirmed",
    requester: "treasury.ops@disburseguard.example",
    invoiceId: "INV-LRC-2026-019",
    dueDate: "2026-05-19",
    paymentPurpose: "Compliance data refresh retainer",
    riskProfile: "medium",
  }),
  block: makeIntent({
    id: "pi_block_northstar",
    scenarioId: "block",
    vendorName: "Northstar Field Services",
    vendorId: "vendor_northstar_field",
    amount: 31800,
    currency: "USD",
    recipientName: "Northstar Field Services",
    recipientAccountFingerprint: "acct_19de_invoice",
    expectedRecipientAccountFingerprint: "acct_6aa2_verified",
    requester: "treasury.ops@disburseguard.example",
    invoiceId: "INV-NFS-2026-404",
    dueDate: "2026-05-17",
    paymentPurpose: "Emergency site remediation",
    riskProfile: "high",
  }),
};

export const payoutFixtures: Record<ScenarioId, PayoutFixture> = {
  clear: {
    intent: intents.clear,
    extraction: makeExtraction(intents.clear, 0.96),
    proofReceipts: [
      makeReceipt({
        provider: "DisburseGuard Vendor Proof",
        evidenceType: "vendor-risk",
        source: "/api/proofs/vendor-risk",
        summary: "Vendor registry, recipient fingerprint, and invoice metadata all match.",
        confidence: 0.94,
        quotedCostUsd: 0.08,
        x402Resource: "/api/proofs/vendor-risk?vendor=vendor_milan_gridworks",
        paymentMode: "deterministic-fallback",
        paymentStatus: "fallback-paid",
        stale: false,
        createdAt,
      }),
    ],
    policyDecision: makePolicyDecision("CLEAR", intents.clear.amount, "USD", ["Verified vendor and paid proof satisfy release policy."]),
  },
  limit: {
    intent: intents.limit,
    extraction: makeExtraction(intents.limit, 0.84, ["Recipient confidence is partial for a high-value invoice."]),
    proofReceipts: [
      makeReceipt({
        provider: "DisburseGuard Vendor Proof",
        evidenceType: "vendor-risk",
        source: "/api/proofs/vendor-risk",
        summary: "Vendor exists and recipient fingerprint is plausible, but confidence is partial.",
        confidence: 0.74,
        quotedCostUsd: 0.12,
        x402Resource: "/api/proofs/vendor-risk?vendor=vendor_alpine_quantum",
        paymentMode: "deterministic-fallback",
        paymentStatus: "fallback-paid",
        stale: false,
        createdAt,
      }),
    ],
    policyDecision: makePolicyDecision("LIMIT", 25000, "USD", [
      "High-value payout requires capped release until proof quality improves.",
    ]),
  },
  review: {
    intent: intents.review,
    extraction: makeExtraction(intents.review, 0.72, ["Evidence source is stale and requires human confirmation."]),
    proofReceipts: [
      makeReceipt({
        provider: "DisburseGuard Vendor Proof",
        evidenceType: "vendor-risk",
        source: "/api/proofs/vendor-risk",
        summary: "Vendor registry record is older than the policy freshness window.",
        confidence: 0.58,
        quotedCostUsd: 0.08,
        x402Resource: "/api/proofs/vendor-risk?vendor=vendor_lagoon_research",
        paymentMode: "deterministic-fallback",
        paymentStatus: "fallback-paid",
        stale: true,
        createdAt,
      }),
    ],
    policyDecision: makePolicyDecision("REVIEW", 0, "USD", [
      "Required paid proof is missing, stale, or below confidence threshold.",
    ]),
  },
  block: {
    intent: intents.block,
    extraction: makeExtraction(intents.block, 0.91, ["Invoice recipient differs from verified vendor record."]),
    proofReceipts: [
      makeReceipt({
        provider: "DisburseGuard Vendor Proof",
        evidenceType: "vendor-risk",
        source: "/api/proofs/vendor-risk",
        summary: "Verified recipient fingerprint does not match the invoice recipient fingerprint.",
        confidence: 0.93,
        quotedCostUsd: 0.1,
        x402Resource: "/api/proofs/vendor-risk?vendor=vendor_northstar_field",
        paymentMode: "deterministic-fallback",
        paymentStatus: "fallback-paid",
        stale: false,
        createdAt,
      }),
    ],
    policyDecision: makePolicyDecision("BLOCK", 0, "USD", [
      "Recipient account does not match the verified vendor record.",
    ]),
  },
};

export function getPayoutFixture(scenarioId: ScenarioId): PayoutFixture {
  return payoutFixtures[scenarioId];
}
