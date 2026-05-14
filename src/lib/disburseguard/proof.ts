import type { PayoutIntent, ProofReceipt } from "./contracts";
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

export type VendorRiskProofResult =
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

type RequestVendorRiskProofInput = {
  intent: PayoutIntent;
  paid: boolean;
  paymentMode?: ProofReceipt["paymentMode"];
};

export function requestVendorRiskProof({
  intent,
  paid,
  paymentMode = "deterministic-fallback",
}: RequestVendorRiskProofInput): VendorRiskProofResult {
  const fixtureReceipt = getPayoutFixture(intent.scenarioId).proofReceipts[0];

  if (!paid) {
    return {
      status: 402,
      paymentRequired: {
        scheme: "x402",
        status: "payment-required",
        provider: fixtureReceipt.provider,
        resource: fixtureReceipt.x402Resource,
        quotedCostUsd: fixtureReceipt.quotedCostUsd,
        accepts: ["USDC", "deterministic-fallback-receipt"],
        fallbackAvailable: true,
      },
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
