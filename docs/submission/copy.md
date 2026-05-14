# Submission Copy

## Project Title

DisburseGuard

## Short Description

Proof-paid treasury firewall where AI agents must buy, verify, sign, and ledger proof before company payouts can move.

## Long Description

DisburseGuard is a proof-paid treasury firewall for autonomous payout workflows. Instead of letting an AI agent summarize risk and move on, DisburseGuard forces the agent to acquire evidence before capital can move. A payout intent enters the system, Gemini extracts invoice and vendor context into structured fields, a Proof Agent requests an x402-style protected proof endpoint, and unpaid proof access returns HTTP 402 payment-required metadata. After a deterministic fallback payment receipt is recorded, the Policy Guard makes a deterministic decision: clear, limit, review, or block. The Audit Agent signs a ClearancePacket containing the decision, approved amount, policy version, proof hashes, expiry, and rationale. Every step is written into an append-only ledger with event hashes and previous-event hashes, so `/api/clearance/:id/verify` can prove both packet authenticity and chain integrity. The demo focuses on B2B FinOps and compliance: no proof, no payout.

## Tags

x402, X402 Payments, Gemini, Vultr, AI agents, B2B FinOps, compliance, treasury, audit ledger, payments
