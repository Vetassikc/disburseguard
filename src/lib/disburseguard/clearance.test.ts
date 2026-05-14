import { describe, expect, it } from "vitest";

import { runClearanceScenario, verifyClearance } from "./clearance";

describe("clearance run orchestration", () => {
  it("runs the primary LIMIT scenario through proof, policy, signing, and ledger verification", async () => {
    const run = await runClearanceScenario("limit");
    const verification = await verifyClearance(run.clearanceId);

    expect(run.policyDecision.decision).toBe("LIMIT");
    expect(run.proofGate.unpaid.status).toBe(402);
    expect(run.proofGate.paid.status).toBe(200);
    expect(run.packet.signingMode).toBe("demo-fixture-key");
    expect(run.ledgerEvents.map((event) => event.eventType)).toEqual([
      "PAYOUT_INTENT_SELECTED",
      "INTAKE_EXTRACTED",
      "PROOF_PLAN_CREATED",
      "PROOF_PAYMENT_REQUIRED",
      "PROOF_RECEIPT_CREATED",
      "POLICY_DECIDED",
      "CLEARANCE_PACKET_SIGNED",
    ]);
    expect(verification.packetValid).toBe(true);
    expect(verification.eventChainValid).toBe(true);
  });
});
