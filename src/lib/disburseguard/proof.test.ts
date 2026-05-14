import { describe, expect, it } from "vitest";

import { payoutFixtures } from "./fixtures";
import { requestVendorRiskProof } from "./proof";

describe("x402-style vendor proof adapter", () => {
  it("returns payment-required metadata for unpaid proof access", () => {
    const result = requestVendorRiskProof({
      intent: payoutFixtures.limit.intent,
      paid: false,
    });

    expect(result.status).toBe(402);
    expect(result.paymentRequired?.scheme).toBe("x402");
    expect(result.paymentRequired?.resource).toContain("/api/proofs/vendor-risk");
    expect(result.receipt).toBeUndefined();
  });

  it("returns a deterministic fallback receipt after fallback payment", () => {
    const result = requestVendorRiskProof({
      intent: payoutFixtures.limit.intent,
      paid: true,
      paymentMode: "deterministic-fallback",
    });

    expect(result.status).toBe(200);
    expect(result.receipt?.paymentStatus).toBe("fallback-paid");
    expect(result.receipt?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
