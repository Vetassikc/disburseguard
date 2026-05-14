CREATE TABLE IF NOT EXISTS "payout_intents" (
  "id" text PRIMARY KEY NOT NULL,
  "scenario_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clearance_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "scenario_id" text NOT NULL,
  "intent_id" text NOT NULL,
  "extraction" jsonb NOT NULL,
  "proof_plan" jsonb NOT NULL,
  "policy_decision" jsonb NOT NULL,
  "proof_gate" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "proof_receipts" (
  "id" text PRIMARY KEY NOT NULL,
  "clearance_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clearance_packets" (
  "id" text PRIMARY KEY NOT NULL,
  "clearance_id" text NOT NULL,
  "packet_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ledger_events" (
  "id" text PRIMARY KEY NOT NULL,
  "clearance_id" text NOT NULL,
  "sequence" integer NOT NULL,
  "event_type" text NOT NULL,
  "event_hash" text NOT NULL,
  "previous_event_hash" text,
  "payload" jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "ledger_events_clearance_sequence_idx"
  ON "ledger_events" ("clearance_id", "sequence");
