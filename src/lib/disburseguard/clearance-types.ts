import type { ClearancePacket, ExtractionResult, LedgerEvent, PayoutIntent, PolicyDecision, ProofPlan, ProofReceipt } from "./contracts";
import type { VendorRiskProofResult } from "./proof";

export type ClearanceRunRecord = {
  clearanceId: string;
  intent: PayoutIntent;
  extraction: ExtractionResult;
  proofPlan: ProofPlan;
  proofGate: {
    unpaid: VendorRiskProofResult;
    paid: VendorRiskProofResult;
  };
  proofReceipts: ProofReceipt[];
  policyDecision: PolicyDecision;
  packet: ClearancePacket;
  ledgerEvents: LedgerEvent[];
  ledgerBackend: "postgres-drizzle" | "memory-dev-ledger";
};

export type ClearanceVerification = {
  clearanceId: string;
  packetValid: boolean;
  eventChainValid: boolean;
  packetHash: string | null;
  lastEventHash: string | null;
  reason?: string;
  verifiedAt: string;
  ledgerBackend: "postgres-drizzle" | "memory-dev-ledger";
};
