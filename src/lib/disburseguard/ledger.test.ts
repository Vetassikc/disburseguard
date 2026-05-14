import { describe, expect, it } from "vitest";

import { createLedgerEvent, verifyLedgerChain } from "./ledger";

describe("append-only ledger chain", () => {
  it("chains events with previous hash and verifies intact history", () => {
    const first = createLedgerEvent({
      clearanceId: "clr_test_chain",
      eventType: "INTAKE_EXTRACTED",
      actor: "Intake Agent",
      payload: { vendorName: "Milan Gridworks" },
      occurredAt: "2026-05-13T16:00:00.000Z",
    });
    const second = createLedgerEvent({
      clearanceId: "clr_test_chain",
      eventType: "PROOF_RECEIPT_CREATED",
      actor: "Proof Agent",
      payload: { evidenceHash: "abc123" },
      previousEventHash: first.eventHash,
      occurredAt: "2026-05-13T16:00:03.000Z",
    });

    const verification = verifyLedgerChain([first, second]);

    expect(first.previousEventHash).toBeNull();
    expect(second.previousEventHash).toBe(first.eventHash);
    expect(verification.valid).toBe(true);
  });

  it("rejects a tampered event payload", () => {
    const first = createLedgerEvent({
      clearanceId: "clr_test_tamper",
      eventType: "POLICY_DECIDED",
      actor: "Policy Guard",
      payload: { decision: "LIMIT", approvedAmount: 25000 },
      occurredAt: "2026-05-13T16:00:00.000Z",
    });
    const tampered = { ...first, payload: { decision: "CLEAR", approvedAmount: 75000 } };

    const verification = verifyLedgerChain([tampered]);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe("Event hash mismatch at index 0.");
  });
});
