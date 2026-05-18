# Slide Deck Outline

Keep the final PDF concise: 6 slides.

## 1. Title

DisburseGuard: Proof-Paid Treasury Firewall for AI Agents

No proof, no payout.

## 2. Problem

AI agents can now initiate real business workflows, but treasury controls still assume a human reviewer sits before every payout.

Risk: a confident agent can summarize an invoice and move money without independently paid, verified, and auditable proof.

## 3. Solution

DisburseGuard forces the payout agent to:

- extract invoice context with Gemini
- request proof through x402-style protected endpoints
- buy proof receipts
- run deterministic treasury policy
- sign a ClearancePacket
- append every event to a Vultr-backed ledger

## 4. Agent Flow

Payout intent -> Gemini extraction -> proof plan -> HTTP 402 proof gate -> paid proof receipts -> Policy Guard -> signed packet -> ledger verification.

## 5. Demo Result

High-value payout scenario:

- requested: USD 75,000
- proof spend: USD 0.39
- authorized: USD 25,000
- capital controlled: USD 50,000
- ledger backend: PostgreSQL on Vultr
- verification: valid packet and valid event chain

## 6. Why It Wins

DisburseGuard converts AI payment safety from a dashboard into an enforceable protocol:

- x402-style proof payment is part of the agent workflow
- proof spend can stop early after a hard-risk signal
- decisions are signed and independently verifiable
- the ledger records proof quotes, receipts, policy, and packet hashes
- the demo is deployed publicly on Vultr
