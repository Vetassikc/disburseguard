import { z } from "zod";

export const scenarioIdSchema = z.enum(["clear", "limit", "review", "block"]);
export const policyOutcomeSchema = z.enum(["CLEAR", "LIMIT", "REVIEW", "BLOCK"]);
export const agentStateSchema = z.enum(["Queued", "Running", "Complete", "Warning", "Failed"]);

export const payoutIntentSchema = z.object({
  id: z.string(),
  scenarioId: scenarioIdSchema,
  vendorName: z.string(),
  vendorId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  recipientName: z.string(),
  recipientAccountFingerprint: z.string(),
  expectedRecipientAccountFingerprint: z.string(),
  requester: z.string(),
  invoiceId: z.string(),
  dueDate: z.string(),
  paymentPurpose: z.string(),
  riskProfile: z.enum(["low", "medium", "high"]),
  documentText: z.string(),
});

export const extractionResultSchema = z.object({
  mode: z.enum(["live-gemini", "fixture-fallback"]),
  model: z.string(),
  confidence: z.number().min(0).max(1),
  fields: z.object({
    vendorName: z.string(),
    invoiceId: z.string(),
    amount: z.number(),
    currency: z.string(),
    recipientName: z.string(),
    recipientAccountFingerprint: z.string(),
    paymentPurpose: z.string(),
    vendorRisk: z.enum(["low", "medium", "high"]),
  }),
  sourceSnippets: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const proofPlanSchema = z.object({
  id: z.string(),
  clearanceId: z.string(),
  generatedBy: z.string(),
  mode: z.enum(["live-gemini", "fixture-fallback"]),
  steps: z.array(
    z.object({
      provider: z.string(),
      evidenceType: z.string(),
      x402Resource: z.string(),
      quotedCostUsd: z.number().nonnegative(),
      required: z.boolean(),
      reason: z.string(),
    }),
  ),
});

export const proofReceiptSchema = z.object({
  id: z.string(),
  provider: z.string(),
  evidenceType: z.string(),
  source: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  quotedCostUsd: z.number().nonnegative(),
  x402Resource: z.string(),
  paymentMode: z.enum(["live-x402", "deterministic-fallback", "unpaid", "quote-unavailable"]),
  paymentStatus: z.enum(["paid", "fallback-paid", "unpaid", "quote-unavailable"]),
  receiptHash: z.string(),
  evidenceHash: z.string(),
  stale: z.boolean(),
  createdAt: z.string(),
});

export const policyDecisionSchema = z.object({
  decision: policyOutcomeSchema,
  approvedAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  policyVersion: z.literal("treasury-policy-v1"),
  reasons: z.array(z.string()),
  checks: z.array(
    z.object({
      label: z.string(),
      status: z.enum(["pass", "warn", "fail"]),
      detail: z.string(),
    }),
  ),
});

export const clearancePacketSchema = z.object({
  id: z.string(),
  clearanceId: z.string(),
  payoutIntentId: z.string(),
  decision: policyOutcomeSchema,
  approvedAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  rationale: z.array(z.string()),
  policyVersion: z.literal("treasury-policy-v1"),
  proofHashes: z.array(z.string()),
  issuedAt: z.string(),
  expiresAt: z.string(),
  packetHash: z.string(),
  signature: z.string(),
  publicKey: z.string(),
  signingMode: z.enum(["production-key", "demo-fixture-key"]),
});

export const ledgerEventTypeSchema = z.enum([
  "PAYOUT_INTENT_SELECTED",
  "INTAKE_EXTRACTED",
  "PROOF_PLAN_CREATED",
  "PROOF_PAYMENT_REQUIRED",
  "PROOF_RECEIPT_CREATED",
  "POLICY_DECIDED",
  "CLEARANCE_PACKET_SIGNED",
  "CLEARANCE_VERIFIED",
]);

export const ledgerEventSchema = z.object({
  id: z.string(),
  clearanceId: z.string(),
  eventType: ledgerEventTypeSchema,
  actor: z.string(),
  payload: z.record(z.string(), z.unknown()),
  payloadHash: z.string(),
  previousEventHash: z.string().nullable(),
  eventHash: z.string(),
  occurredAt: z.string(),
});

export type ScenarioId = z.infer<typeof scenarioIdSchema>;
export type PayoutIntent = z.infer<typeof payoutIntentSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type ProofPlan = z.infer<typeof proofPlanSchema>;
export type ProofReceipt = z.infer<typeof proofReceiptSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type ClearancePacket = z.infer<typeof clearancePacketSchema>;
export type LedgerEvent = z.infer<typeof ledgerEventSchema>;
export type LedgerEventType = z.infer<typeof ledgerEventTypeSchema>;
