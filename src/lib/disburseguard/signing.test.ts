import { describe, expect, it } from "vitest";

import { payoutFixtures } from "./fixtures";
import { buildUnsignedPacket, signClearancePacket, verifyClearancePacket } from "./signing";

describe("ClearancePacket signing", () => {
  it("signs with the deterministic demo key when no production key is configured", async () => {
    const fixture = payoutFixtures.limit;
    const unsignedPacket = buildUnsignedPacket({
      clearanceId: "clr_test_limit",
      intent: fixture.intent,
      policyDecision: fixture.policyDecision,
      proofReceipts: fixture.proofReceipts,
      issuedAt: "2026-05-13T16:00:00.000Z",
    });

    const packet = await signClearancePacket(unsignedPacket);
    const verification = await verifyClearancePacket(packet);

    expect(packet.signingMode).toBe("demo-fixture-key");
    expect(packet.signature).toMatch(/^[a-f0-9]{128}$/);
    expect(packet.packetHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verification.valid).toBe(true);
  });

  it("rejects a packet after approved amount tampering", async () => {
    const fixture = payoutFixtures.clear;
    const unsignedPacket = buildUnsignedPacket({
      clearanceId: "clr_test_tamper",
      intent: fixture.intent,
      policyDecision: fixture.policyDecision,
      proofReceipts: fixture.proofReceipts,
      issuedAt: "2026-05-13T16:00:00.000Z",
    });

    const packet = await signClearancePacket(unsignedPacket);
    const tampered = { ...packet, approvedAmount: packet.approvedAmount + 1000 };

    const verification = await verifyClearancePacket(tampered);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe("Packet hash mismatch.");
  });
});
