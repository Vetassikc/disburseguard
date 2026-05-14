import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

import type { ClearancePacket, PayoutIntent, PolicyDecision, ProofReceipt } from "./contracts";
import { hashObject } from "./hashing";

ed.hashes.sha512 = sha512;

const encoder = new TextEncoder();
const DEMO_KEY_SEED = "DisburseGuard deterministic demo signing key";

export type UnsignedClearancePacket = Omit<ClearancePacket, "packetHash" | "signature" | "publicKey" | "signingMode">;

type BuildUnsignedPacketInput = {
  clearanceId: string;
  intent: PayoutIntent;
  policyDecision: PolicyDecision;
  proofReceipts: ProofReceipt[];
  issuedAt?: string;
};

export type PacketVerification = {
  valid: boolean;
  reason?: string;
  packetHash: string;
};

export function buildUnsignedPacket({
  clearanceId,
  intent,
  policyDecision,
  proofReceipts,
  issuedAt = new Date().toISOString(),
}: BuildUnsignedPacketInput): UnsignedClearancePacket {
  const expiresAt = new Date(Date.parse(issuedAt) + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `packet_${clearanceId}`,
    clearanceId,
    payoutIntentId: intent.id,
    decision: policyDecision.decision,
    approvedAmount: policyDecision.approvedAmount,
    currency: policyDecision.currency,
    rationale: policyDecision.reasons,
    policyVersion: policyDecision.policyVersion,
    proofHashes: proofReceipts.map((receipt) => receipt.evidenceHash),
    issuedAt,
    expiresAt,
  };
}

export async function signClearancePacket(unsignedPacket: UnsignedClearancePacket): Promise<ClearancePacket> {
  const { privateKey, publicKey, signingMode } = getSigningKeyMaterial();
  const packetHash = hashObject(unsignedPacket);
  const signature = await ed.signAsync(encoder.encode(packetHash), privateKey);

  return {
    ...unsignedPacket,
    packetHash,
    signature: bytesToHex(signature),
    publicKey,
    signingMode,
  };
}

export async function verifyClearancePacket(packet: ClearancePacket): Promise<PacketVerification> {
  const unsignedPacket = stripSignedFields(packet);
  const packetHash = hashObject(unsignedPacket);

  if (packetHash !== packet.packetHash) {
    return { valid: false, reason: "Packet hash mismatch.", packetHash };
  }

  const valid = await ed.verifyAsync(hexToBytes(packet.signature), encoder.encode(packet.packetHash), hexToBytes(packet.publicKey));
  return valid ? { valid: true, packetHash } : { valid: false, reason: "Signature verification failed.", packetHash };
}

function stripSignedFields(packet: ClearancePacket): UnsignedClearancePacket {
  return {
    id: packet.id,
    clearanceId: packet.clearanceId,
    payoutIntentId: packet.payoutIntentId,
    decision: packet.decision,
    approvedAmount: packet.approvedAmount,
    currency: packet.currency,
    rationale: packet.rationale,
    policyVersion: packet.policyVersion,
    proofHashes: packet.proofHashes,
    issuedAt: packet.issuedAt,
    expiresAt: packet.expiresAt,
  };
}

function getSigningKeyMaterial(): { privateKey: Uint8Array; publicKey: string; signingMode: ClearancePacket["signingMode"] } {
  const configuredKey = process.env.SIGNING_PRIVATE_KEY_HEX;
  const privateKey = configuredKey && /^[a-fA-F0-9]{64}$/.test(configuredKey) ? hexToBytes(configuredKey) : sha256(encoder.encode(DEMO_KEY_SEED));
  const signingMode = configuredKey && /^[a-fA-F0-9]{64}$/.test(configuredKey) ? "production-key" : "demo-fixture-key";

  return {
    privateKey,
    publicKey: bytesToHex(ed.getPublicKey(privateKey)),
    signingMode,
  };
}
