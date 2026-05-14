import type { ScenarioId } from "./contracts";
import type { ClearanceRunRecord, ClearanceVerification } from "./clearance-types";
import { createProofPlan } from "./proof-plan";
import { extractPayoutContext } from "./extraction";
import { getPayoutFixture, payoutFixtures } from "./fixtures";
import { createLedgerEvent, verifyLedgerChain } from "./ledger";
import { decidePolicy } from "./policy";
import { getLedgerBackendLabel, loadClearanceRecord, persistClearanceRecord } from "./persistence";
import { requestVendorRiskProof } from "./proof";
import { buildUnsignedPacket, signClearancePacket, verifyClearancePacket } from "./signing";

type Store = {
  runs: Map<string, ClearanceRunRecord>;
  latestRunId: string | null;
};

const globalStore = globalThis as typeof globalThis & { disburseGuardStore?: Store };

function getStore(): Store {
  if (!globalStore.disburseGuardStore) {
    globalStore.disburseGuardStore = { runs: new Map(), latestRunId: null };
  }

  return globalStore.disburseGuardStore;
}

export function listPayoutIntents() {
  return Object.values(payoutFixtures).map((fixture) => fixture.intent);
}

export function listClearanceRuns(): ClearanceRunRecord[] {
  return Array.from(getStore().runs.values()).map(cloneRunRecord).reverse();
}

export function getLatestClearanceRun(): ClearanceRunRecord | null {
  const latestRunId = getStore().latestRunId;
  return latestRunId ? cloneRunRecordOrNull(getStore().runs.get(latestRunId) ?? null) : null;
}

export async function runClearanceScenario(scenarioId: ScenarioId): Promise<ClearanceRunRecord> {
  const fixture = getPayoutFixture(scenarioId);
  const clearanceId = `clr_${scenarioId}_${Date.now().toString(36)}`;
  const occurredAt = new Date().toISOString();
  const extraction = await extractPayoutContext(fixture.intent);
  const proofPlan = createProofPlan(clearanceId, fixture.intent, extraction);
  const unpaid = requestVendorRiskProof({ intent: fixture.intent, paid: false });
  const paid = requestVendorRiskProof({ intent: fixture.intent, paid: true, paymentMode: "deterministic-fallback" });
  const proofReceipts = paid.status === 200 ? [paid.receipt] : [];
  const policyDecision = decidePolicy({ intent: fixture.intent, extraction, proofReceipts });
  const packet = await signClearancePacket(
    buildUnsignedPacket({
      clearanceId,
      intent: fixture.intent,
      policyDecision,
      proofReceipts,
      issuedAt: occurredAt,
    }),
  );

  const ledgerEvents = buildRunLedger({
    clearanceId,
    occurredAt,
    intentId: fixture.intent.id,
    extractionConfidence: extraction.confidence,
    proofPlanId: proofPlan.id,
    unpaid,
    proofReceiptId: proofReceipts[0]?.id ?? null,
    policyDecision: policyDecision.decision,
    packetHash: packet.packetHash,
  });

  const record: ClearanceRunRecord = {
    clearanceId,
    intent: fixture.intent,
    extraction,
    proofPlan,
    proofGate: { unpaid, paid },
    proofReceipts,
    policyDecision,
    packet,
    ledgerEvents,
    ledgerBackend: getLedgerBackendLabel(),
  };

  getStore().runs.set(clearanceId, record);
  getStore().latestRunId = clearanceId;
  await persistBestEffort(record);

  return cloneRunRecord(record);
}

export async function getClearanceRun(clearanceId: string): Promise<ClearanceRunRecord | null> {
  const memoryRecord = getStore().runs.get(clearanceId);
  if (memoryRecord) {
    return cloneRunRecord(memoryRecord);
  }

  const persisted = await loadBestEffort(clearanceId);
  if (persisted) {
    getStore().runs.set(clearanceId, persisted);
    getStore().latestRunId = clearanceId;
    return cloneRunRecord(persisted);
  }

  return null;
}

export async function verifyClearance(clearanceId: string): Promise<ClearanceVerification> {
  const record = await getClearanceRun(clearanceId);
  const verifiedAt = new Date().toISOString();

  if (!record) {
    return {
      clearanceId,
      packetValid: false,
      eventChainValid: false,
      packetHash: null,
      lastEventHash: null,
      reason: "Clearance run not found.",
      verifiedAt,
      ledgerBackend: getLedgerBackendLabel(),
    };
  }

  const packetVerification = await verifyClearancePacket(record.packet);
  const verificationEvent = createLedgerEvent({
    clearanceId,
    eventType: "CLEARANCE_VERIFIED",
    actor: "Audit Agent",
    payload: {
      packetValid: packetVerification.valid,
      packetHash: packetVerification.packetHash,
    },
    previousEventHash: record.ledgerEvents.at(-1)?.eventHash ?? null,
    occurredAt: verifiedAt,
  });
  const eventsWithVerification = [...record.ledgerEvents, verificationEvent];
  const chainVerification = verifyLedgerChain(eventsWithVerification);

  const updatedRecord = { ...record, ledgerEvents: eventsWithVerification };
  getStore().runs.set(clearanceId, updatedRecord);
  await persistBestEffort(updatedRecord);

  return {
    clearanceId,
    packetValid: packetVerification.valid,
    eventChainValid: chainVerification.valid,
    packetHash: packetVerification.packetHash,
    lastEventHash: chainVerification.lastEventHash ?? null,
    reason: packetVerification.reason ?? chainVerification.reason,
    verifiedAt,
    ledgerBackend: updatedRecord.ledgerBackend,
  };
}

function buildRunLedger(input: {
  clearanceId: string;
  occurredAt: string;
  intentId: string;
  extractionConfidence: number;
  proofPlanId: string;
  unpaid: ReturnType<typeof requestVendorRiskProof>;
  proofReceiptId: string | null;
  policyDecision: string;
  packetHash: string;
}) {
  const events = [
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "PAYOUT_INTENT_SELECTED",
      actor: "Intake Agent",
      payload: { intentId: input.intentId },
      occurredAt: input.occurredAt,
    }),
  ];

  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "INTAKE_EXTRACTED",
      actor: "Intake Agent",
      payload: { extractionConfidence: input.extractionConfidence },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "PROOF_PLAN_CREATED",
      actor: "Proof Agent",
      payload: { proofPlanId: input.proofPlanId },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "PROOF_PAYMENT_REQUIRED",
      actor: "Payment/Quote Agent",
      payload: input.unpaid.status === 402 ? input.unpaid.paymentRequired : { status: input.unpaid.status },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "PROOF_RECEIPT_CREATED",
      actor: "Proof Agent",
      payload: { proofReceiptId: input.proofReceiptId },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "POLICY_DECIDED",
      actor: "Policy Guard",
      payload: { decision: input.policyDecision },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "CLEARANCE_PACKET_SIGNED",
      actor: "Audit Agent",
      payload: { packetHash: input.packetHash },
      previousEventHash: events.at(-1)?.eventHash ?? null,
      occurredAt: input.occurredAt,
    }),
  );

  return events;
}

async function persistBestEffort(record: ClearanceRunRecord): Promise<void> {
  try {
    await persistClearanceRecord(record);
  } catch (error) {
    console.warn("PostgreSQL persistence unavailable; continuing with memory demo ledger.", error);
  }
}

async function loadBestEffort(clearanceId: string): Promise<ClearanceRunRecord | null> {
  try {
    return await loadClearanceRecord(clearanceId);
  } catch (error) {
    console.warn("PostgreSQL load unavailable; checking memory demo ledger.", error);
    return null;
  }
}

function cloneRunRecord(record: ClearanceRunRecord): ClearanceRunRecord {
  return structuredClone(record);
}

function cloneRunRecordOrNull(record: ClearanceRunRecord | null): ClearanceRunRecord | null {
  return record ? cloneRunRecord(record) : null;
}
