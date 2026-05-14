import type { LedgerEvent, LedgerEventType } from "./contracts";
import { hashObject } from "./hashing";

type CreateLedgerEventInput = {
  clearanceId: string;
  eventType: LedgerEventType;
  actor: string;
  payload: Record<string, unknown>;
  previousEventHash?: string | null;
  occurredAt?: string;
};

export type LedgerVerification = {
  valid: boolean;
  reason?: string;
  lastEventHash?: string | null;
};

export function createLedgerEvent({
  clearanceId,
  eventType,
  actor,
  payload,
  previousEventHash = null,
  occurredAt = new Date().toISOString(),
}: CreateLedgerEventInput): LedgerEvent {
  const payloadHash = hashObject(payload);
  const id = `evt_${hashObject({ clearanceId, eventType, actor, payloadHash, previousEventHash, occurredAt }).slice(0, 16)}`;
  const eventHash = hashLedgerEvent({ id, clearanceId, eventType, actor, payload, previousEventHash, occurredAt });

  return {
    id,
    clearanceId,
    eventType,
    actor,
    payload,
    payloadHash,
    previousEventHash,
    eventHash,
    occurredAt,
  };
}

export function verifyLedgerChain(events: LedgerEvent[]): LedgerVerification {
  let previousEventHash: string | null = null;

  for (const [index, event] of events.entries()) {
    if (event.previousEventHash !== previousEventHash) {
      return {
        valid: false,
        reason: `Previous hash mismatch at index ${index}.`,
        lastEventHash: previousEventHash,
      };
    }

    const expectedEventHash = hashLedgerEvent(event);
    if (event.eventHash !== expectedEventHash) {
      return {
        valid: false,
        reason: `Event hash mismatch at index ${index}.`,
        lastEventHash: previousEventHash,
      };
    }

    previousEventHash = event.eventHash;
  }

  return { valid: true, lastEventHash: previousEventHash };
}

function hashLedgerEvent(event: Pick<LedgerEvent, "id" | "clearanceId" | "eventType" | "actor" | "payload" | "previousEventHash" | "occurredAt">): string {
  return hashObject({
    id: event.id,
    clearanceId: event.clearanceId,
    eventType: event.eventType,
    actor: event.actor,
    payloadHash: hashObject(event.payload),
    previousEventHash: event.previousEventHash,
    occurredAt: event.occurredAt,
  });
}
