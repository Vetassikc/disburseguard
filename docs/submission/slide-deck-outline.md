# Slide Deck Outline

Keep the final PDF concise: 7 slides.

## 1. Thesis

No proof. No payout.

DisburseGuard is a proof-paid treasury firewall for AI payout agents. The agent must buy, verify, sign, and ledger proof before company money can move.

## 2. Why Now

AI agents are crossing from advice into authorization.

Summaries are not proof. A payout agent needs a pre-payout enforcement layer, not another dashboard after the money is gone.

## 3. Paid Proof

Evidence is protected by payment, not trust.

Proof endpoints return HTTP 402 until the agent pays. Only paid receipts can enter the treasury policy decision.

## 4. Agent Workflow

The product is an acting agent, not a passive dashboard.

- extract invoice context with Gemini
- request proof through x402-style protected endpoints
- buy proof receipts
- run deterministic treasury policy
- sign a ClearancePacket
- append every event to a Vultr-backed ledger

Payout intent -> Gemini extraction -> proof plan -> HTTP 402 proof gate -> paid proof receipts -> Policy Guard -> signed packet -> ledger verification.

## 5. Treasury Decision

Proof quality directly controls how much capital can move. High-value payout scenario:

- requested: USD 75,000
- proof spend: USD 0.39
- authorized: USD 25,000
- capital controlled: USD 50,000
- ledger backend: PostgreSQL on Vultr
- verification: valid packet and valid event chain

## 6. Verification

Every clearance becomes independently verifiable.

The ClearancePacket contains proof hashes, policy version, expiry, rationale, public key, and signature. The ledger chains every event hash.

## 7. Why It Wins

DisburseGuard is a protocol-shaped product for autonomous finance:

- x402-style proof payment is part of the agent workflow
- proof spend can stop early after a hard-risk signal
- decisions are signed and independently verifiable
- the ledger records proof quotes, receipts, policy, and packet hashes
- the demo is deployed publicly on Vultr
