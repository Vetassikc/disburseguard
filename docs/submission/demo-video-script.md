# Demo Video Script

Target length: 2 minutes. Hard limit: 5 minutes.

## Opening

DisburseGuard is a proof-paid treasury firewall for AI payout agents.

The thesis is simple: no proof, no payout. An AI agent cannot move company money until it buys evidence, verifies it, applies policy, signs a ClearancePacket, and writes the decision to an append-only ledger.

## Demo Flow

1. Open `http://80.240.26.25/demo`.
2. Select the default high-value hardware reserve scenario.
3. Click `Run clearance`.
4. Show Gemini/OpenRouter extraction for the invoice and payment context.
5. Show the x402 proof gate returning `HTTP 402 Payment Required`.
6. Show the Proof Marketplace buying four paid proof receipts:
   - vendor-risk
   - recipient-match
   - sanctions-screen
   - delivery-attestation
7. Show the Treasury Verdict:
   - requested: USD 75,000
   - authorized: USD 25,000
   - controlled: USD 50,000
8. Show the signed ClearancePacket with `production-key`.
9. Show the ledger status: `postgres-drizzle` and `valid chain`.
10. Open `http://80.240.26.25/ledger`.
11. Show persisted verification history and append-only proof events.

## Closing

DisburseGuard is not another dashboard. It is an enforcement layer for autonomous finance: the agent spends cents on verifiable proof before it can release thousands of dollars in company funds.

The system runs on a Vultr VM, uses Gemini for structured extraction, implements x402-style paid proof gates, signs treasury decisions, and verifies the full ledger chain through the public API.
