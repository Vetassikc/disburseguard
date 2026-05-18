# Submission Copy

## Project Title

DisburseGuard

## Short Description

Proof-paid treasury firewall where AI agents must buy, verify, sign, and ledger proof before company payouts can move.

## Long Description

DisburseGuard is a proof-paid treasury firewall for autonomous payout workflows. Instead of letting an AI agent summarize risk and move on, DisburseGuard forces the agent to acquire evidence before capital can move. A payout intent enters the system, Gemini extracts invoice and vendor context into structured fields, and a Proof Agent creates a multi-proof marketplace plan across vendor-risk, recipient-match, sanctions-screen, and delivery-attestation resources. Each proof endpoint is protected by an x402-style HTTP 402 payment gate. The Payment/Quote Agent buys deterministic fallback receipts, or stops proof spend early when a hard-risk signal already blocks the payout. Policy Guard then clears, limits, reviews, or blocks the payout based on the receipt set. Audit Agent signs a ClearancePacket containing the decision, approved amount, policy version, proof hashes, expiry, and rationale. Every step is written into a Vultr-backed append-only ledger with event hashes and previous-event hashes, so `/api/clearance/:id/verify` can prove both packet authenticity and chain integrity. The demo reports proof spend, skipped proof spend, capital requested, capital approved, and capital controlled.

## Tags

x402, X402 Payments, Gemini, Vultr, AI agents, B2B FinOps, compliance, treasury, audit ledger, payments, proof marketplace, sanctions screening, recipient verification

## Cover Image

Use `public/disburseguard-cover.svg` as a 16:9 cover asset. Export to PNG if the submission form does not accept SVG.

## Demo URL

http://80.240.26.25/demo

## Ledger URL

http://80.240.26.25/ledger

## Video Script

See `docs/submission/demo-video-script.md`.

## Slide Deck Outline

See `docs/submission/slide-deck-outline.md`.

## Kraken Social

See `docs/submission/kraken-social.md`.
