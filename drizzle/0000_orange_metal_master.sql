CREATE TABLE "clearance_packets" (
	"id" text PRIMARY KEY NOT NULL,
	"clearance_id" text NOT NULL,
	"packet_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clearance_runs" (
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
--> statement-breakpoint
CREATE TABLE "ledger_events" (
	"id" text PRIMARY KEY NOT NULL,
	"clearance_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" text NOT NULL,
	"event_hash" text NOT NULL,
	"previous_event_hash" text,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"clearance_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
