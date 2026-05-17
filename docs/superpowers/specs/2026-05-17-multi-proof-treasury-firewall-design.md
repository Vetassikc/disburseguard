# Multi-Proof Treasury Firewall Design

## Goal

Raise DisburseGuard from a single paid-proof demo to a multi-proof treasury firewall where an AI agent plans, buys, evaluates, signs, and ledgers several compliance proofs before payout authorization. The upgrade should strengthen the x402 Payments, B2B FinOps & Compliance, Agentic Workflows, Gemini, and Vultr judging story without adding real secrets or fragile live settlement dependencies.

## Product Bet

The strongest differentiator is not a generic dashboard or a trading integration. It is a visible proof-commerce loop:

1. A payout intent arrives.
2. Gemini extracts structured invoice, vendor, recipient, and payment context.
3. Proof Agent creates a proof plan across multiple paid proof resources.
4. Each proof endpoint returns HTTP 402 when unpaid.
5. Payment/Quote Agent buys only the proofs needed for the scenario using deterministic x402 fallback receipts.
6. Policy Guard evaluates the full receipt set.
7. Audit Agent signs a ClearancePacket.
8. Vultr-backed PostgreSQL records an append-only event chain.
9. Verification proves the packet and chain are valid.

This shows an agent acting economically: it spends proof budget to protect company capital, and it can stop early when a hard-risk signal makes further proof spend wasteful.

## Scope

Implement four proof evidence types:

- `vendor-risk`: vendor registry, risk, and confidence evidence.
- `recipient-match`: invoice recipient versus verified vendor account evidence.
- `sanctions-screen`: sanctions, watchlist, and critical compliance evidence.
- `delivery-attestation`: delivery, contract, or milestone evidence.

All proof types use the existing x402-style pattern: unpaid requests return `402 Payment Required`; paid fallback requests return deterministic `ProofReceipt` values. Live x402 remains behind the existing feature flag and is not required for this upgrade.

## Scenario Behavior

- `CLEAR`: buys all four proofs; all pass; policy clears the full payout.
- `LIMIT`: buys all four proofs; vendor and recipient pass, but high value plus partial delivery/confidence caps authorization at `25000`.
- `REVIEW`: buys all four proofs; no hard fraud, but stale or low-confidence proof routes to review.
- `BLOCK`: buys vendor, recipient, and sanctions proofs; stops before delivery attestation once recipient mismatch or sanctions/vendor hard risk is known; policy blocks with zero approved amount.

## Data Model

Extend the existing contracts instead of introducing a new subsystem:

- Add `ProofEvidenceType` as a Zod enum.
- Keep `ProofPlan.steps[]`, but require each step to include `evidenceType: ProofEvidenceType`.
- Keep `ProofReceipt`, but ensure `evidenceType` is typed as `ProofEvidenceType`.
- Add optional run-level economics to `ClearanceRunRecord`:
  - `proofSpendUsd`
  - `capitalRequested`
  - `capitalApproved`
  - `capitalControlled`
  - `proofsPurchased`
  - `proofsSkipped`

Persistence can continue storing full run JSON in existing tables, so no migration is required unless tests expose a schema mismatch.

## API Design

Retain `POST /api/proofs/vendor-risk` and add:

- `POST /api/proofs/recipient-match`
- `POST /api/proofs/sanctions-screen`
- `POST /api/proofs/delivery-attestation`

Each route accepts the same shape:

```json
{
  "intent": {
    "id": "pi_limit_alpine_quantum",
    "scenarioId": "limit",
    "vendorName": "Alpine Quantum Components AG"
  },
  "paid": true,
  "paymentMode": "deterministic-fallback"
}
```

Unpaid calls return `402` with payment metadata. Paid calls return `200` with the deterministic receipt for that proof.

## Orchestration

`runClearanceScenario` should:

1. Build the multi-step proof plan.
2. Request each proof unpaid to record the 402 wall.
3. Buy proof receipts according to scenario strategy.
4. Stop early for `BLOCK` once a hard failure is already sufficient.
5. Evaluate policy with the full receipt set.
6. Build ledger events for each proof payment requirement and each proof receipt.
7. Persist the run as before.

The orchestrator should remain deterministic for demo stability.

## Policy

Policy remains versioned as `treasury-policy-v1`, but it evaluates proof categories:

- `CLEAR`: all required proof receipts are paid, fresh, non-critical, high enough confidence, recipient matches, and amount is within release threshold.
- `LIMIT`: paid proof exists and no hard failure exists, but amount or confidence requires capped approval at `25000`.
- `REVIEW`: proof is paid but stale, incomplete, or below confidence without a hard fraud/sanctions signal.
- `BLOCK`: recipient mismatch, sanctions hit, high-risk vendor, or critical proof failure.

Checks shown in the UI should reference concrete proof categories rather than generic proof quality.

## UI

Add a judge-facing Proof Marketplace section on `/demo`:

- Shows every planned proof resource.
- Shows `402 required`, `paid`, `skipped`, or `blocked` state.
- Shows quote, receipt hash, confidence, and short rationale.
- Shows proof spend and capital controlled.

Update Treasury Verdict and Proof Wall to use multi-proof economics:

- “Agent bought 4 proofs for $0.38 to protect $50,000.”
- “Stopped after 3 proofs because recipient mismatch made further spend unnecessary.”
- “Ledger verified N proof events.”

Do not create a separate landing page. `/demo` remains the first screen.

## Testing

Add or update tests for:

- Every proof endpoint returns `402` unpaid and `200` paid.
- Every scenario produces the expected number of proof receipts.
- `BLOCK` stops before delivery attestation.
- Policy outcomes remain `CLEAR`, `LIMIT`, `REVIEW`, and `BLOCK`.
- Ledger chain remains valid with multiple proof events.
- Playwright sees `Proof Marketplace`, `HTTP 402 required`, a paid receipt, and `valid chain`.

## Non-Goals

- No Kraken trading/PnL agent.
- No real wallet keys, seed phrases, or settlement secrets.
- No Speechmatics or Featherless implementation in this pass.
- No database split, queue system, or microservice architecture.
- No broad policy editor unless the multi-proof flow is complete and verified.
