import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { clearancePackets, clearanceRuns, ledgerEvents, payoutIntents, proofReceipts } from "@/db/schema";

import type { ClearanceRunRecord } from "./clearance-types";
import type { ClearancePacket, LedgerEvent, ProofReceipt } from "./contracts";

let sqlClient: ReturnType<typeof postgres> | null = null;
let dbClient: ReturnType<typeof drizzle> | null = null;

export function getLedgerBackendLabel(): "postgres-drizzle" | "memory-dev-ledger" {
  return process.env.DATABASE_URL ? "postgres-drizzle" : "memory-dev-ledger";
}

export async function persistClearanceRecord(record: ClearanceRunRecord): Promise<void> {
  const db = getDb();
  if (!db) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(payoutIntents)
      .values({
        id: record.intent.id,
        scenarioId: record.intent.scenarioId,
        payload: record.intent,
      })
      .onConflictDoUpdate({
        target: payoutIntents.id,
        set: { payload: record.intent },
      });

    await tx
      .insert(clearanceRuns)
      .values({
        id: record.clearanceId,
        scenarioId: record.intent.scenarioId,
        intentId: record.intent.id,
        extraction: record.extraction,
        proofPlan: record.proofPlan,
        policyDecision: record.policyDecision,
        proofGate: record.proofGate,
      })
      .onConflictDoUpdate({
        target: clearanceRuns.id,
        set: {
          extraction: record.extraction,
          proofPlan: record.proofPlan,
          policyDecision: record.policyDecision,
          proofGate: record.proofGate,
          updatedAt: new Date(),
        },
      });

    for (const receipt of record.proofReceipts) {
      await tx
        .insert(proofReceipts)
        .values({
          id: receipt.id,
          clearanceId: record.clearanceId,
          payload: receipt,
        })
        .onConflictDoUpdate({
          target: proofReceipts.id,
          set: { payload: receipt },
        });
    }

    await tx
      .insert(clearancePackets)
      .values({
        id: record.packet.id,
        clearanceId: record.clearanceId,
        packetHash: record.packet.packetHash,
        payload: record.packet,
      })
      .onConflictDoUpdate({
        target: clearancePackets.id,
        set: { packetHash: record.packet.packetHash, payload: record.packet },
      });

    for (const [sequence, event] of record.ledgerEvents.entries()) {
      await tx
        .insert(ledgerEvents)
        .values({
          id: event.id,
          clearanceId: record.clearanceId,
          sequence,
          eventType: event.eventType,
          eventHash: event.eventHash,
          previousEventHash: event.previousEventHash,
          payload: event,
          occurredAt: new Date(event.occurredAt),
        })
        .onConflictDoUpdate({
          target: ledgerEvents.id,
          set: {
            sequence,
            eventType: event.eventType,
            eventHash: event.eventHash,
            previousEventHash: event.previousEventHash,
            payload: event,
          },
        });
    }
  });
}

export async function loadClearanceRecord(clearanceId: string): Promise<ClearanceRunRecord | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [run] = await db.select().from(clearanceRuns).where(eq(clearanceRuns.id, clearanceId)).limit(1);
  const [intent] = await db.select().from(payoutIntents).where(eq(payoutIntents.id, run?.intentId ?? "")).limit(1);
  const [packet] = await db.select().from(clearancePackets).where(eq(clearancePackets.clearanceId, clearanceId)).limit(1);

  if (!run || !intent || !packet) {
    return null;
  }

  const receipts = await db.select().from(proofReceipts).where(eq(proofReceipts.clearanceId, clearanceId));
  const events = await db.select().from(ledgerEvents).where(eq(ledgerEvents.clearanceId, clearanceId)).orderBy(asc(ledgerEvents.sequence));

  return {
    clearanceId: run.id,
    intent: intent.payload as ClearanceRunRecord["intent"],
    extraction: run.extraction as ClearanceRunRecord["extraction"],
    proofPlan: run.proofPlan as ClearanceRunRecord["proofPlan"],
    proofGate: run.proofGate as ClearanceRunRecord["proofGate"],
    proofReceipts: receipts.map((receipt) => receipt.payload as ProofReceipt),
    policyDecision: run.policyDecision as ClearanceRunRecord["policyDecision"],
    packet: packet.payload as ClearancePacket,
    ledgerEvents: events.map((event) => event.payload as LedgerEvent),
    ledgerBackend: "postgres-drizzle",
  };
}

function getDb(): ReturnType<typeof drizzle> | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!sqlClient || !dbClient) {
    sqlClient = postgres(process.env.DATABASE_URL, { max: 1 });
    dbClient = drizzle(sqlClient);
  }

  return dbClient;
}
