import type { ProofEvidenceType, ScenarioId } from "./contracts";
import type { ClearanceRunRecord, ClearanceVerification, ProofEconomics } from "./clearance-types";
import { createProofPlan } from "./proof-plan";
import { extractPayoutContext } from "./extraction";
import { getPayoutFixture, payoutFixtures } from "./fixtures";
import { createLedgerEvent, verifyLedgerChain } from "./ledger";
import { decidePolicy } from "./policy";
import { getLedgerBackendLabel, listPersistedClearanceRecords, loadClearanceRecord, persistClearanceRecord } from "./persistence";
import { requestProofEvidence } from "./proof";
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

export async function listClearanceRunsWithPersistence(): Promise<ClearanceRunRecord[]> {
  const memoryRuns = listClearanceRuns();
  const persistedRuns = await listPersistedBestEffort();
  const runsById = new Map<string, ClearanceRunRecord>();

  for (const run of [...memoryRuns, ...persistedRuns]) {
    runsById.set(run.clearanceId, run);
    getStore().runs.set(run.clearanceId, run);
  }

  return Array.from(runsById.values()).sort((a, b) => {
    const aTime = Date.parse(a.ledgerEvents[0]?.occurredAt ?? "0");
    const bTime = Date.parse(b.ledgerEvents[0]?.occurredAt ?? "0");
    return bTime - aTime;
  });
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
  const plannedTypes = proofPlan.steps.map((step) => step.evidenceType);
  const purchasedTypes = selectPurchasedProofs(scenarioId, plannedTypes);
  const skippedTypes = plannedTypes.filter((evidenceType) => !purchasedTypes.includes(evidenceType));
  const unpaidByType = Object.fromEntries(
    plannedTypes.map((evidenceType) => [
      evidenceType,
      requestProofEvidence({ intent: fixture.intent, evidenceType, paid: false }),
    ]),
  ) as Partial<Record<ProofEvidenceType, ReturnType<typeof requestProofEvidence>>>;
  const paidByType = Object.fromEntries(
    purchasedTypes.map((evidenceType) => [
      evidenceType,
      requestProofEvidence({ intent: fixture.intent, evidenceType, paid: true, paymentMode: "deterministic-fallback" }),
    ]),
  ) as Partial<Record<ProofEvidenceType, ReturnType<typeof requestProofEvidence>>>;
  const unpaid = unpaidByType["vendor-risk"] ?? requestProofEvidence({ intent: fixture.intent, evidenceType: "vendor-risk", paid: false });
  const paid = paidByType["vendor-risk"] ?? requestProofEvidence({ intent: fixture.intent, evidenceType: "vendor-risk", paid: true });
  const proofReceipts = purchasedTypes.flatMap((evidenceType) => {
    const result = paidByType[evidenceType];
    return result?.status === 200 ? [result.receipt] : [];
  });
  const policyDecision = decidePolicy({ intent: fixture.intent, extraction, proofReceipts });
  const proofEconomics = buildProofEconomics({
    intentAmount: fixture.intent.amount,
    approvedAmount: policyDecision.approvedAmount,
    proofReceipts,
    skippedTypes,
  });
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
    unpaidByType,
    proofReceipts,
    skippedTypes,
    policyDecision: policyDecision.decision,
    proofEconomics,
    packetHash: packet.packetHash,
  });

  const record: ClearanceRunRecord = {
    clearanceId,
    intent: fixture.intent,
    extraction,
    proofPlan,
    proofGate: { unpaid, paid, unpaidByType, paidByType },
    proofReceipts,
    proofEconomics,
    policyDecision,
    packet,
    ledgerEvents,
    ledgerBackend: "memory-dev-ledger",
  };

  record.ledgerBackend = await persistBestEffort(record);
  getStore().runs.set(clearanceId, record);
  getStore().latestRunId = clearanceId;

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

  const updatedRecord: ClearanceRunRecord = { ...record, ledgerEvents: eventsWithVerification };
  updatedRecord.ledgerBackend = await persistBestEffort(updatedRecord);
  getStore().runs.set(clearanceId, updatedRecord);

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
  unpaidByType: Partial<Record<ProofEvidenceType, ReturnType<typeof requestProofEvidence>>>;
  proofReceipts: ClearanceRunRecord["proofReceipts"];
  skippedTypes: ProofEvidenceType[];
  policyDecision: string;
  proofEconomics: ProofEconomics;
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
  for (const [evidenceType, unpaid] of Object.entries(input.unpaidByType) as Array<[ProofEvidenceType, ReturnType<typeof requestProofEvidence>]>) {
    events.push(
      createLedgerEvent({
        clearanceId: input.clearanceId,
        eventType: "PROOF_PAYMENT_REQUIRED",
        actor: "Payment/Quote Agent",
        payload: unpaid.status === 402 ? { evidenceType, ...unpaid.paymentRequired } : { evidenceType, status: unpaid.status },
        previousEventHash: events.at(-1)?.eventHash ?? null,
        occurredAt: input.occurredAt,
      }),
    );

    const receipt = input.proofReceipts.find((candidate) => candidate.evidenceType === evidenceType);
    if (receipt) {
      events.push(
        createLedgerEvent({
          clearanceId: input.clearanceId,
          eventType: "PROOF_RECEIPT_CREATED",
          actor: "Proof Agent",
          payload: {
            evidenceType,
            proofReceiptId: receipt.id,
            receiptHash: receipt.receiptHash,
            quotedCostUsd: receipt.quotedCostUsd,
          },
          previousEventHash: events.at(-1)?.eventHash ?? null,
          occurredAt: input.occurredAt,
        }),
      );
    } else if (input.skippedTypes.includes(evidenceType)) {
      events.push(
        createLedgerEvent({
          clearanceId: input.clearanceId,
          eventType: "PROOF_RECEIPT_CREATED",
          actor: "Proof Agent",
          payload: {
            evidenceType,
            proofReceiptId: null,
            skipped: true,
            reason: "Hard-risk signal stopped further proof spend.",
          },
          previousEventHash: events.at(-1)?.eventHash ?? null,
          occurredAt: input.occurredAt,
        }),
      );
    }
  }
  events.push(
    createLedgerEvent({
      clearanceId: input.clearanceId,
      eventType: "POLICY_DECIDED",
      actor: "Policy Guard",
      payload: {
        decision: input.policyDecision,
        proofSpendUsd: input.proofEconomics.proofSpendUsd,
        capitalControlled: input.proofEconomics.capitalControlled,
      },
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

function selectPurchasedProofs(scenarioId: ScenarioId, plannedTypes: ProofEvidenceType[]): ProofEvidenceType[] {
  if (scenarioId === "block") {
    return plannedTypes.filter((evidenceType) => evidenceType !== "delivery-attestation");
  }

  return plannedTypes;
}

function buildProofEconomics(input: {
  intentAmount: number;
  approvedAmount: number;
  proofReceipts: ClearanceRunRecord["proofReceipts"];
  skippedTypes: ProofEvidenceType[];
}): ProofEconomics {
  return {
    proofSpendUsd: input.proofReceipts.reduce((sum, receipt) => sum + receipt.quotedCostUsd, 0),
    capitalRequested: input.intentAmount,
    capitalApproved: input.approvedAmount,
    capitalControlled: Math.max(input.intentAmount - input.approvedAmount, 0),
    proofsPurchased: input.proofReceipts.map((receipt) => receipt.evidenceType),
    proofsSkipped: input.skippedTypes,
  };
}

async function persistBestEffort(record: ClearanceRunRecord): Promise<ClearanceRunRecord["ledgerBackend"]> {
  try {
    return (await persistClearanceRecord(record)) ? "postgres-drizzle" : "memory-dev-ledger";
  } catch (error) {
    console.warn("PostgreSQL persistence unavailable; continuing with memory demo ledger.", error);
    return "memory-dev-ledger";
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

async function listPersistedBestEffort(): Promise<ClearanceRunRecord[]> {
  try {
    return await listPersistedClearanceRecords();
  } catch (error) {
    console.warn("PostgreSQL list unavailable; showing memory demo ledger.", error);
    return [];
  }
}

function cloneRunRecord(record: ClearanceRunRecord): ClearanceRunRecord {
  return structuredClone(record);
}

function cloneRunRecordOrNull(record: ClearanceRunRecord | null): ClearanceRunRecord | null {
  return record ? cloneRunRecord(record) : null;
}
