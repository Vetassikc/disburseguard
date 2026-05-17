import { describe, expect, it } from "vitest";

import { payoutFixtures } from "./fixtures";
import { requestProofEvidence, requestVendorRiskProof } from "./proof";

describe("x402-style proof adapter", () => {
  it("returns payment-required metadata for unpaid proof access", () => {
    const result = requestProofEvidence({
      intent: payoutFixtures.limit.intent,
      evidenceType: "recipient-match",
      paid: false,
    });

    expect(result.status).toBe(402);
    expect(result.paymentRequired?.scheme).toBe("x402");
    expect(result.paymentRequired?.resource).toContain("/api/proofs/recipient-match");
    expect(result.receipt).toBeUndefined();
  });

  it("returns a deterministic fallback receipt after fallback payment", () => {
    const result = requestProofEvidence({
      intent: payoutFixtures.limit.intent,
      evidenceType: "recipient-match",
      paid: true,
      paymentMode: "deterministic-fallback",
    });

    expect(result.status).toBe(200);
    expect(result.receipt?.evidenceType).toBe("recipient-match");
    expect(result.receipt?.paymentStatus).toBe("fallback-paid");
    expect(result.receipt?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("supports all required proof evidence types", () => {
    for (const evidenceType of ["vendor-risk", "recipient-match", "sanctions-screen", "delivery-attestation"] as const) {
      const unpaid = requestProofEvidence({ intent: payoutFixtures.limit.intent, evidenceType, paid: false });
      expect(unpaid.status).toBe(402);

      const paid = requestProofEvidence({ intent: payoutFixtures.limit.intent, evidenceType, paid: true });
      expect(paid.status).toBe(200);
      expect(paid.receipt?.evidenceType).toBe(evidenceType);
    }
  });

  it("keeps the vendor-risk compatibility helper", () => {
    const result = requestVendorRiskProof({
      intent: payoutFixtures.limit.intent,
      paid: true,
    });

    expect(result.status).toBe(200);
    expect(result.receipt?.evidenceType).toBe("vendor-risk");
  });
});
