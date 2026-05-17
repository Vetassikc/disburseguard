import { describe, expect, it } from "vitest";

import { payoutFixtures } from "./fixtures";
import { decidePolicy } from "./policy";

describe("treasury-policy-v1", () => {
  it("clears a verified vendor with matching recipient and paid high-confidence proof", () => {
    const fixture = payoutFixtures.clear;

    const decision = decidePolicy({
      intent: fixture.intent,
      extraction: fixture.extraction,
      proofReceipts: fixture.proofReceipts,
    });

    expect(decision.decision).toBe("CLEAR");
    expect(decision.approvedAmount).toBe(fixture.intent.amount);
    expect(decision.policyVersion).toBe("treasury-policy-v1");
    expect(decision.checks.map((check) => check.label)).toContain("Sanctions screen");
    expect(decision.checks.map((check) => check.label)).toContain("Delivery attestation");
  });

  it("limits a high-value payout with partial confidence to 25000", () => {
    const fixture = payoutFixtures.limit;

    const decision = decidePolicy({
      intent: fixture.intent,
      extraction: fixture.extraction,
      proofReceipts: fixture.proofReceipts,
    });

    expect(decision.decision).toBe("LIMIT");
    expect(decision.approvedAmount).toBe(25000);
    expect(decision.reasons).toContain("High-value payout requires capped release until proof quality improves.");
  });

  it("sends stale or missing paid proof to review", () => {
    const fixture = payoutFixtures.review;

    const decision = decidePolicy({
      intent: fixture.intent,
      extraction: fixture.extraction,
      proofReceipts: fixture.proofReceipts,
    });

    expect(decision.decision).toBe("REVIEW");
    expect(decision.approvedAmount).toBe(0);
    expect(decision.reasons).toContain("Required paid proof is missing, stale, or below confidence threshold.");
  });

  it("blocks recipient mismatch before capital can move", () => {
    const fixture = payoutFixtures.block;

    const decision = decidePolicy({
      intent: fixture.intent,
      extraction: fixture.extraction,
      proofReceipts: fixture.proofReceipts,
    });

    expect(decision.decision).toBe("BLOCK");
    expect(decision.approvedAmount).toBe(0);
    expect(fixture.proofReceipts.some((receipt) => receipt.evidenceType === "delivery-attestation")).toBe(false);
    expect(decision.reasons).toContain("Recipient account does not match the verified vendor record.");
  });
});
