import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const payoutIntents = pgTable("payout_intents", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clearanceRuns = pgTable("clearance_runs", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  intentId: text("intent_id").notNull(),
  extraction: jsonb("extraction").notNull(),
  proofPlan: jsonb("proof_plan").notNull(),
  policyDecision: jsonb("policy_decision").notNull(),
  proofGate: jsonb("proof_gate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const proofReceipts = pgTable("proof_receipts", {
  id: text("id").primaryKey(),
  clearanceId: text("clearance_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clearancePackets = pgTable("clearance_packets", {
  id: text("id").primaryKey(),
  clearanceId: text("clearance_id").notNull(),
  packetHash: text("packet_hash").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerEvents = pgTable("ledger_events", {
  id: text("id").primaryKey(),
  clearanceId: text("clearance_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: text("event_type").notNull(),
  eventHash: text("event_hash").notNull(),
  previousEventHash: text("previous_event_hash"),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
});
