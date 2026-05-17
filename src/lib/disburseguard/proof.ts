import type { PayoutIntent, ProofEvidenceType, ProofReceipt } from "./contracts";
import { getPayoutFixture } from "./fixtures";

export type PaymentRequired = {
  scheme: "x402";
  status: "payment-required";
  provider: string;
  resource: string;
  quotedCostUsd: number;
  accepts: string[];
  fallbackAvailable: boolean;
};

export type ProofEvidenceResult =
  | {
      status: 402;
      paymentRequired: PaymentRequired;
      receipt?: never;
    }
  | {
      status: 200;
      paymentRequired?: never;
      receipt: ProofReceipt;
    };

type RequestProofEvidenceInput = {
  intent: PayoutIntent;
  evidenceType: ProofEvidenceType;
  paid: boolean;
  paymentMode?: ProofReceipt["paymentMode"];
};

export function requestProofEvidence({
  intent,
  evidenceType,
  paid,
  paymentMode = "deterministic-fallback",
}: RequestProofEvidenceInput): ProofEvidenceResult {
  const fixtureReceipt = getPayoutFixture(intent.scenarioId).proofReceipts.find((receipt) => receipt.evidenceType === evidenceType);
  const paymentRequired: PaymentRequired = {
    scheme: "x402",
    status: "payment-required",
    provider: fixtureReceipt?.provider ?? `DisburseGuard ${evidenceType} Proof`,
    resource: fixtureReceipt?.x402Resource ?? `/api/proofs/${evidenceType}?vendor=${encodeURIComponent(intent.vendorId)}`,
    quotedCostUsd: fixtureReceipt?.quotedCostUsd ?? getDefaultQuote(evidenceType),
    accepts: ["USDC", "deterministic-fallback-receipt"],
    fallbackAvailable: true,
  };

  if (!paid) {
    return {
      status: 402,
      paymentRequired,
    };
  }

  if (!fixtureReceipt) {
    return {
      status: 402,
      paymentRequired,
    };
  }

  return {
    status: 200,
    receipt: {
      ...fixtureReceipt,
      paymentMode,
      paymentStatus: paymentMode === "live-x402" ? "paid" : "fallback-paid",
    },
  };
}

export type VendorRiskProofResult = ProofEvidenceResult;

export function requestVendorRiskProof(input: Omit<RequestProofEvidenceInput, "evidenceType">): ProofEvidenceResult {
  return requestProofEvidence({ ...input, evidenceType: "vendor-risk" });
}

function getDefaultQuote(evidenceType: ProofEvidenceType): number {
  if (evidenceType === "recipient-match") return 0.07;
  if (evidenceType === "sanctions-screen") return 0.11;
  if (evidenceType === "delivery-attestation") return 0.09;
  return 0.08;
}
