# Slide Deck Outline

Keep the final PDF concise: 7 slides.

## 1. Treasury Checkpoint

AI agents can request money. Proof decides what moves.

DisburseGuard turns payout authorization into a checkpoint: the agent must buy evidence, pass policy, sign clearance, and ledger the result before company funds can move.

## 2. The Gap

Dashboards explain risk after money already left.

Autonomous finance needs enforcement before payout, not a prettier audit view after the agent has acted.

## 3. Paid Proof

Evidence is a paid gate, not a trusted checkbox.

Protected proof endpoints deny access with HTTP 402. The Payment Agent must create receipts before evidence can influence the treasury decision.

## 4. Agent Loop

The demo acts through a full clearance chain.

- extract invoice context with Gemini
- request proof through x402-style protected endpoints
- buy proof receipts
- run deterministic treasury policy
- sign a ClearancePacket
- append every event to a Vultr-backed ledger

Payout intent -> Gemini extraction -> proof plan -> HTTP 402 proof gate -> paid proof receipts -> Policy Guard -> signed packet -> ledger verification.

## 5. Live Result

$0.39 of proof spend controls $50K of exposure. High-value payout scenario:

- requested: USD 75,000
- proof spend: USD 0.39
- authorized: USD 25,000
- capital controlled: USD 50,000
- ledger backend: PostgreSQL on Vultr
- verification: valid packet and valid event chain

## 6. Verifiable Ledger

Every clearance becomes independently verifiable.

The ClearancePacket contains proof hashes, policy version, expiry, rationale, public key, and signature. The ledger chains every event hash.

## 7. Why It Wins

DisburseGuard is a payment primitive for agentic finance, not a generic dashboard:

- x402-style proof payment is part of the agent workflow
- proof spend can stop early after a hard-risk signal
- decisions are signed and independently verifiable
- the ledger records proof quotes, receipts, policy, and packet hashes
- the demo is deployed publicly on Vultr
