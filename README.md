# DisburseGuard

DisburseGuard is a clean-room hackathon implementation of a proof-paid treasury firewall for AI agents.

**Thesis:** no proof, no payout. An autonomous payout agent must request paid proof, receive a proof receipt, pass deterministic policy, produce a signed `ClearancePacket`, and record an append-only ledger before company money can move.

## Vertical Slice

- `/demo` runs the judge-facing clearance loop.
- `/ledger` shows packet and ledger verification history.
- `POST /api/clearance/run` executes a seeded payout scenario.
- `POST /api/proofs/vendor-risk` returns HTTP `402` payment-required metadata when unpaid and a deterministic fallback receipt when paid.
- `GET /api/clearance/:id/verify` verifies the signed packet and event chain.

## Sponsor Usage

- **x402 Payments:** multiple proof endpoints are protected by HTTP 402-style payment gates. The agent receives quotes, buys deterministic fallback receipts, and can stop proof spend after a hard-risk signal.
- **Gemini:** extraction defaults to clearly labeled fixture fallback. Set `GEMINI_MODE=live` and `GEMINI_API_KEY` to enable direct Gemini API extraction. If Google AI Studio prepay credits are unavailable, set `GEMINI_MODE=openrouter` with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL=google/gemini-2.5-flash` to route the same Gemini extraction step through OpenRouter.
- **Vultr/PostgreSQL:** Drizzle tables and migrations are included for a PostgreSQL-backed ledger on a Vultr VM. Without `DATABASE_URL`, the app uses a labeled in-memory demo ledger.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://127.0.0.1:3000/demo`.

For a production-like local ledger, run PostgreSQL with Docker:

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
```

Then set this local-only value in `.env.local`:

```env
DATABASE_URL=postgres://disburseguard:disburseguard-local@127.0.0.1:55432/disburseguard
```

The `disburseguard-local` password is only a development credential for the local Docker database. Use a strong unique value on Vultr.

## Deployment

The Vultr VM deployment path is documented in [docs/deployment/vultr-vm.md](docs/deployment/vultr-vm.md). It uses Docker Compose to run the Next.js app and PostgreSQL on one small VM for the hackathon demo.

## Submission Assets

- Cover image: [public/disburseguard-cover.svg](public/disburseguard-cover.svg)
- Submission copy: [docs/submission/copy.md](docs/submission/copy.md)
- Demo video script: [docs/submission/demo-video-script.md](docs/submission/demo-video-script.md)
- Slide deck outline: [docs/submission/slide-deck-outline.md](docs/submission/slide-deck-outline.md)
- Kraken social copy: [docs/submission/kraken-social.md](docs/submission/kraken-social.md)

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
```

## Clean-Room Note

This repository contains original code, prompts, fixtures, styles, and tests for DisburseGuard. It does not copy implementation artifacts from ProofMesh, Sentinel, Vartovii, CryptoTax, or prior projects. Do not commit real secrets, wallet keys, seed phrases, API keys, or provider credentials.

## License

MIT
