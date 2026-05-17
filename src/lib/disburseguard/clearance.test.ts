import { describe, expect, it } from "vitest";

import { runClearanceScenario, verifyClearance } from "./clearance";

describe("clearance run orchestration", () => {
  it("runs the primary LIMIT scenario through proof, policy, signing, and ledger verification", async () => {
    const run = await runClearanceScenario("limit");
    const verification = await verifyClearance(run.clearanceId);

    expect(run.policyDecision.decision).toBe("LIMIT");
    expect(run.proofPlan.steps).toHaveLength(4);
    expect(run.proofReceipts.map((receipt) => receipt.evidenceType)).toEqual([
      "vendor-risk",
      "recipient-match",
      "sanctions-screen",
      "delivery-attestation",
    ]);
    expect(run.proofGate.unpaid.status).toBe(402);
    expect(run.proofGate.paid.status).toBe(200);
    expect(run.proofEconomics.proofSpendUsd).toBeGreaterThan(0);
    expect(run.proofEconomics.capitalControlled).toBe(50000);
    expect(run.ledgerEvents.filter((event) => event.eventType === "PROOF_PAYMENT_REQUIRED")).toHaveLength(4);
    expect(run.ledgerEvents.filter((event) => event.eventType === "PROOF_RECEIPT_CREATED")).toHaveLength(4);
    expect(run.packet.signingMode).toBe("demo-fixture-key");
    expect(run.ledgerEvents.map((event) => event.eventType)).toEqual([
      "PAYOUT_INTENT_SELECTED",
      "INTAKE_EXTRACTED",
      "PROOF_PLAN_CREATED",
      "PROOF_PAYMENT_REQUIRED",
      "PROOF_RECEIPT_CREATED",
      "PROOF_PAYMENT_REQUIRED",
      "PROOF_RECEIPT_CREATED",
      "PROOF_PAYMENT_REQUIRED",
      "PROOF_RECEIPT_CREATED",
      "PROOF_PAYMENT_REQUIRED",
      "PROOF_RECEIPT_CREATED",
      "POLICY_DECIDED",
      "CLEARANCE_PACKET_SIGNED",
    ]);
    expect(verification.packetValid).toBe(true);
    expect(verification.eventChainValid).toBe(true);
  });

  it("blocks with early proof-spend stop before delivery attestation", async () => {
    const run = await runClearanceScenario("block");

    expect(run.policyDecision.decision).toBe("BLOCK");
    expect(run.proofPlan.steps).toHaveLength(4);
    expect(run.proofReceipts.map((receipt) => receipt.evidenceType)).not.toContain("delivery-attestation");
    expect(run.proofEconomics.proofsSkipped).toContain("delivery-attestation");
    expect(run.proofEconomics.capitalApproved).toBe(0);
  });
});
