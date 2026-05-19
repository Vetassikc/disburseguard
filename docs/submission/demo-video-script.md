# Demo Video Script

## Інструкція для запису

Спочатку встав англійський voiceover нижче в Google Text-to-Speech і згенеруй аудіо. Потім відкрий демо, запусти screen recording і рухайся по таймінгах під готову доріжку.

Цільова довжина: 1:50-2:15. Ліміт lablab.ai: до 5 хвилин.

Перед записом:

1. Відкрий `http://80.240.26.25/demo`.
2. Переконайся, що видно `postgres-drizzle`.
3. Залиш сценарій `High-value hardware reserve`.
4. Не клікай `Run clearance` до моменту в сценарії.
5. Записуй у 16:9, бажано 1440p або 1080p.

## Google TTS Voiceover

```text
DisburseGuard is a proof-paid treasury firewall for AI payout agents.

The thesis is simple: no proof, no payout.

Today, autonomous agents can read invoices, summarize risk, and trigger business workflows. But company money should not move just because an agent sounds confident.

DisburseGuard turns payout safety into an enforceable protocol.

Here is the live demo running on a Vultr virtual machine.

We start with a high-value payout intent: a seventy-five thousand dollar hardware reserve invoice.

When I run clearance, the intake agent extracts structured invoice and vendor context with Gemini through OpenRouter.

Next, the Proof Agent creates a multi-proof plan. It does not just display a checklist. It calls protected proof endpoints.

The first proof endpoint returns HTTP four-oh-two: payment required. This is the key idea. Evidence is not free metadata. The agent must buy proof before treasury policy can use it.

The Payment and Quote Agent buys four deterministic proof receipts: vendor risk, recipient match, sanctions screen, and delivery attestation.

Now Policy Guard evaluates the receipt set. The payout requested seventy-five thousand dollars, but proof quality is only partial, so DisburseGuard authorizes twenty-five thousand and controls fifty thousand dollars before funds can move.

The Audit Agent signs a Clearance Packet with a production signing key. The packet includes the decision, approved amount, policy version, proof hashes, expiry, and rationale.

Every step is written to a PostgreSQL ledger on Vultr. The ledger chains events with previous hashes and event hashes, so the public verify endpoint can prove packet authenticity and event-chain integrity.

This is not another enterprise dashboard. DisburseGuard is an enforcement layer for autonomous finance: spend cents on paid proof before releasing thousands in company funds.

It combines Gemini extraction, x402-style proof payment gates, deterministic treasury policy, signed clearance packets, and a Vultr-backed verification ledger.
```

## Screen Recording Timeline

| Time | Action |
| --- | --- |
| 0:00 | Show `/demo` first fold: title, `postgres-drizzle`, payout intent. |
| 0:18 | Slowly point/hover over the high-value scenario. |
| 0:28 | Click `Run clearance`. |
| 0:36 | Show Gemini/OpenRouter extraction panel. |
| 0:48 | Show `HTTP 402 Payment Required` in x402 Proof Gate. |
| 1:02 | Scroll to Proof Wall and Proof Marketplace. |
| 1:15 | Show `Agent bought 4 proofs for $0.39`. |
| 1:26 | Show Treasury Verdict: requested 75k, authorized 25k, controlled 50k. |
| 1:38 | Show ClearancePacket: `production-key`, packet hash, valid chain. |
| 1:48 | Open `/ledger`. |
| 1:58 | Show persisted ledger events and `valid chain`. |
| 2:08 | End on `/ledger` or return to `/demo` title. |

## Recording Notes

- Do not explain every UI card. Follow the audio and let the product prove the flow.
- Keep the cursor slow and intentional.
- If the app is already in a completed state, reload `/demo` before recording.
- If the first run takes a second, keep recording; the agent state animation helps the story.
