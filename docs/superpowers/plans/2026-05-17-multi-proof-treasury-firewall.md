# Multi-Proof Treasury Firewall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-proof x402 treasury firewall where the agent plans, buys, skips, evaluates, signs, and ledgers several paid compliance proofs before payout authorization.

**Architecture:** Extend the existing deterministic vertical slice instead of creating a new subsystem. Add proof evidence typing, multi-proof fixtures, a generic proof adapter, proof endpoints, multi-proof policy evaluation, ledger events, and judge-facing Proof Marketplace UI.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, Vitest, Playwright, Drizzle/PostgreSQL, existing x402-style proof adapter.

---

## File Map

- Modify `src/lib/disburseguard/contracts.ts`: add `proofEvidenceTypeSchema`; type proof plan and receipts against it.
- Modify `src/lib/disburseguard/fixtures.ts`: create four deterministic receipts per non-block scenario and three purchased receipts for `BLOCK`.
- Modify `src/lib/disburseguard/proof-plan.ts`: generate a multi-step proof plan.
- Modify `src/lib/disburseguard/proof.ts`: replace single-purpose request helper with generic proof evidence helper while preserving `requestVendorRiskProof`.
- Create API route files under `src/app/api/proofs/{recipient-match,sanctions-screen,delivery-attestation}/route.ts`.
- Modify `src/app/api/proofs/vendor-risk/route.ts`: call the generic proof helper.
- Modify `src/lib/disburseguard/policy.ts`: evaluate receipts by proof category.
- Modify `src/lib/disburseguard/clearance-types.ts`: add proof economics and multi-proof gate records.
- Modify `src/lib/disburseguard/clearance.ts`: orchestrate all unpaid proof gates, paid receipts, block early stopping, economics, and multi-proof ledger events.
- Modify `src/lib/disburseguard/persistence.ts`: restore new economics fields when loading from PostgreSQL.
- Modify `src/app/demo/demo-client.tsx`: add Proof Marketplace and update verdict/proof wall copy.
- Modify `src/app/globals.css`: style marketplace and proof economics.
- Modify tests in `src/lib/disburseguard/*.test.ts` and `tests/e2e/demo-ledger.spec.ts`.

---

### Task 1: Contracts And Fixture Shape

**Files:**
- Modify: `src/lib/disburseguard/contracts.ts`
- Modify: `src/lib/disburseguard/fixtures.ts`
- Test: `src/lib/disburseguard/proof.test.ts`

- [ ] **Step 1: Update proof contract types**

In `src/lib/disburseguard/contracts.ts`, add:

```ts
export const proofEvidenceTypeSchema = z.enum(["vendor-risk", "recipient-match", "sanctions-screen", "delivery-attestation"]);
```

Change `proofPlanSchema.steps[].evidenceType` from `z.string()` to `proofEvidenceTypeSchema`.

Change `proofReceiptSchema.evidenceType` from `z.string()` to `proofEvidenceTypeSchema`.

Add export:

```ts
export type ProofEvidenceType = z.infer<typeof proofEvidenceTypeSchema>;
```

- [ ] **Step 2: Update fixture helper types**

In `src/lib/disburseguard/fixtures.ts`, import `ProofEvidenceType` from `./contracts`.

Add:

```ts
const proofProviders: Record<ProofEvidenceType, string> = {
  "vendor-risk": "DisburseGuard Vendor Proof",
  "recipient-match": "DisburseGuard Recipient Proof",
  "sanctions-screen": "DisburseGuard Sanctions Proof",
  "delivery-attestation": "DisburseGuard Delivery Proof",
};

function proofSource(evidenceType: ProofEvidenceType): string {
  return `/api/proofs/${evidenceType}`;
}

function proofResource(evidenceType: ProofEvidenceType, intent: PayoutIntent): string {
  return `${proofSource(evidenceType)}?vendor=${encodeURIComponent(intent.vendorId)}`;
}
```

- [ ] **Step 3: Replace each fixture's `proofReceipts` with multi-proof receipts**

For `clear`, create four receipts:

```ts
makeReceipt({
  provider: proofProviders["vendor-risk"],
  evidenceType: "vendor-risk",
  source: proofSource("vendor-risk"),
  summary: "Vendor registry is active, low risk, and matches invoice metadata.",
  confidence: 0.94,
  quotedCostUsd: 0.08,
  x402Resource: proofResource("vendor-risk", intents.clear),
  paymentMode: "deterministic-fallback",
  paymentStatus: "fallback-paid",
  stale: false,
  createdAt,
})
```

Add matching `recipient-match` receipt with confidence `0.96`, quote `0.07`, summary `"Verified recipient account fingerprint matches the invoice recipient."`.

Add `sanctions-screen` receipt with confidence `0.98`, quote `0.11`, summary `"No sanctions, watchlist, or adverse media hit was found."`.

Add `delivery-attestation` receipt with confidence `0.91`, quote `0.09`, summary `"Consulting milestone acceptance and invoice purpose are consistent."`.

For `limit`, create four receipts with confidences `0.74`, `0.78`, `0.96`, `0.67`; delivery summary must say `"Hardware reserve documentation is plausible but only partially attested."`.

For `review`, create four receipts with one stale delivery receipt: `delivery-attestation` confidence `0.57`, `stale: true`, summary `"Delivery evidence is older than the treasury freshness window."`.

For `block`, create three receipts only: `vendor-risk`, `recipient-match`, `sanctions-screen`. Do not include `delivery-attestation`; this models early stopping. Recipient receipt summary must say `"Verified recipient fingerprint does not match the invoice recipient fingerprint."`.

- [ ] **Step 4: Run fixture typecheck**

Run:

```bash
pnpm typecheck
```

Expected: FAIL until all evidence type strings satisfy `ProofEvidenceType`, then PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/disburseguard/contracts.ts src/lib/disburseguard/fixtures.ts
git commit -m "Add multi-proof fixture contracts"
```

---

### Task 2: Generic x402 Proof Adapter And API Routes

**Files:**
- Modify: `src/lib/disburseguard/proof.ts`
- Modify: `src/app/api/proofs/vendor-risk/route.ts`
- Create: `src/app/api/proofs/recipient-match/route.ts`
- Create: `src/app/api/proofs/sanctions-screen/route.ts`
- Create: `src/app/api/proofs/delivery-attestation/route.ts`
- Test: `src/lib/disburseguard/proof.test.ts`

- [ ] **Step 1: Update proof tests first**

Replace `src/lib/disburseguard/proof.test.ts` with tests that import `requestProofEvidence`.

Required assertions:

```ts
expect(result.status).toBe(402);
expect(result.paymentRequired?.resource).toContain("/api/proofs/recipient-match");
expect(paid.receipt?.evidenceType).toBe("recipient-match");
expect(paid.receipt?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
```

Add a test for all four evidence types:

```ts
for (const evidenceType of ["vendor-risk", "recipient-match", "sanctions-screen", "delivery-attestation"] as const) {
  const unpaid = requestProofEvidence({ intent: payoutFixtures.limit.intent, evidenceType, paid: false });
  expect(unpaid.status).toBe(402);
  const paid = requestProofEvidence({ intent: payoutFixtures.limit.intent, evidenceType, paid: true });
  expect(paid.status).toBe(200);
  expect(paid.receipt?.evidenceType).toBe(evidenceType);
}
```

- [ ] **Step 2: Implement generic proof helper**

In `src/lib/disburseguard/proof.ts`, rename the result type to:

```ts
export type ProofEvidenceResult =
  | {
      status: 402;
      paymentRequired: PaymentRequired;
      receipt?: never;
    }
  | {
      status: 200;
      paymentRequired?: never;
      receipt: ProofReceipt;
    };
```

Create:

```ts
type RequestProofEvidenceInput = {
  intent: PayoutIntent;
  evidenceType: ProofEvidenceType;
  paid: boolean;
  paymentMode?: ProofReceipt["paymentMode"];
};

export function requestProofEvidence({ intent, evidenceType, paid, paymentMode = "deterministic-fallback" }: RequestProofEvidenceInput): ProofEvidenceResult {
  const fixtureReceipt = getPayoutFixture(intent.scenarioId).proofReceipts.find((receipt) => receipt.evidenceType === evidenceType);
  const paymentRequired: PaymentRequired = {
    scheme: "x402",
    status: "payment-required",
    provider: fixtureReceipt?.provider ?? `DisburseGuard ${evidenceType} Proof`,
    resource: fixtureReceipt?.x402Resource ?? `/api/proofs/${evidenceType}?vendor=${encodeURIComponent(intent.vendorId)}`,
    quotedCostUsd: fixtureReceipt?.quotedCostUsd ?? (evidenceType === "sanctions-screen" ? 0.11 : 0.08),
    accepts: ["USDC", "deterministic-fallback-receipt"],
    fallbackAvailable: true,
  };

  if (!fixtureReceipt) {
    return {
      status: 402,
      paymentRequired,
    };
  }

  if (!paid) {
    return { status: 402, paymentRequired };
  }

  return {
    status: 200,
    receipt: {
      ...fixtureReceipt,
      paymentMode,
      paymentStatus: paymentMode === "live-x402" ? "paid" : "fallback-paid",
    },
  };
}
```

Keep compatibility:

```ts
export type VendorRiskProofResult = ProofEvidenceResult;

export function requestVendorRiskProof(input: Omit<RequestProofEvidenceInput, "evidenceType">): ProofEvidenceResult {
  return requestProofEvidence({ ...input, evidenceType: "vendor-risk" });
}
```

- [ ] **Step 3: Create route helper inside each API file**

For `src/app/api/proofs/recipient-match/route.ts`, use:

```ts
import { NextResponse } from "next/server";

import { scenarioIdSchema } from "@/lib/disburseguard/contracts";
import { getPayoutFixture } from "@/lib/disburseguard/fixtures";
import { requestProofEvidence } from "@/lib/disburseguard/proof";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scenarioId = scenarioIdSchema.safeParse(body.scenarioId);

  if (!scenarioId.success) {
    return NextResponse.json({ error: "Invalid scenarioId." }, { status: 400 });
  }

  const result = requestProofEvidence({
    intent: getPayoutFixture(scenarioId.data).intent,
    evidenceType: "recipient-match",
    paid: body.paid === true,
    paymentMode: body.paymentMode === "live-x402" ? "live-x402" : "deterministic-fallback",
  });

  return NextResponse.json(result, { status: result.status });
}
```

Repeat for `sanctions-screen` and `delivery-attestation`, changing only `evidenceType`.

Update `vendor-risk/route.ts` to call `requestProofEvidence` with `evidenceType: "vendor-risk"`.

- [ ] **Step 4: Run tests**

```bash
pnpm test src/lib/disburseguard/proof.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/disburseguard/proof.ts src/app/api/proofs
git commit -m "Add multi-proof x402 proof adapters"
```

---

### Task 3: Multi-Proof Plan, Policy, And Clearance Orchestration

**Files:**
- Modify: `src/lib/disburseguard/proof-plan.ts`
- Modify: `src/lib/disburseguard/policy.ts`
- Modify: `src/lib/disburseguard/clearance-types.ts`
- Modify: `src/lib/disburseguard/clearance.ts`
- Modify: `src/lib/disburseguard/persistence.ts`
- Test: `src/lib/disburseguard/policy.test.ts`
- Test: `src/lib/disburseguard/clearance.test.ts`

- [ ] **Step 1: Update policy tests**

Add assertions:

```ts
expect(decision.checks.map((check) => check.label)).toContain("Sanctions screen");
expect(decision.checks.map((check) => check.label)).toContain("Delivery attestation");
```

For `block`, assert:

```ts
expect(fixture.proofReceipts.some((receipt) => receipt.evidenceType === "delivery-attestation")).toBe(false);
```

- [ ] **Step 2: Update clearance tests**

In `clearance.test.ts`, expect:

```ts
expect(run.proofPlan.steps).toHaveLength(4);
expect(run.proofReceipts.map((receipt) => receipt.evidenceType)).toEqual([
  "vendor-risk",
  "recipient-match",
  "sanctions-screen",
  "delivery-attestation",
]);
expect(run.proofEconomics.proofSpendUsd).toBeGreaterThan(0);
expect(run.proofEconomics.capitalControlled).toBe(50000);
expect(run.ledgerEvents.filter((event) => event.eventType === "PROOF_PAYMENT_REQUIRED")).toHaveLength(4);
expect(run.ledgerEvents.filter((event) => event.eventType === "PROOF_RECEIPT_CREATED")).toHaveLength(4);
```

Add a `BLOCK` test:

```ts
const run = await runClearanceScenario("block");
expect(run.proofReceipts.map((receipt) => receipt.evidenceType)).not.toContain("delivery-attestation");
expect(run.proofEconomics.proofsSkipped).toContain("delivery-attestation");
expect(run.policyDecision.decision).toBe("BLOCK");
```

- [ ] **Step 3: Add economics type**

In `clearance-types.ts`, import `ProofEvidenceType` and add:

```ts
export type ProofEconomics = {
  proofSpendUsd: number;
  capitalRequested: number;
  capitalApproved: number;
  capitalControlled: number;
  proofsPurchased: ProofEvidenceType[];
  proofsSkipped: ProofEvidenceType[];
};
```

Add `proofEconomics: ProofEconomics` to `ClearanceRunRecord`.

Change `proofGate` to:

```ts
proofGate: {
  unpaid: VendorRiskProofResult;
  paid: VendorRiskProofResult;
  unpaidByType: Partial<Record<ProofEvidenceType, VendorRiskProofResult>>;
  paidByType: Partial<Record<ProofEvidenceType, VendorRiskProofResult>>;
};
```

- [ ] **Step 4: Generate multi-step proof plan**

In `proof-plan.ts`, create a constant ordered list:

```ts
const proofSteps = [
  ["vendor-risk", 0.08, "Vendor identity and risk must be checked before treasury release."],
  ["recipient-match", 0.07, "Invoice recipient must match the verified vendor payment account."],
  ["sanctions-screen", 0.11, "Sanctions and watchlist proof is mandatory for automated payout decisions."],
  ["delivery-attestation", 0.09, "Delivery or milestone proof is required before full release."],
] as const;
```

Return all four steps, using `0.12` for `vendor-risk` when `intent.amount > 50000`.

- [ ] **Step 5: Update policy implementation**

In `policy.ts`, build:

```ts
const receiptsByType = new Map(paidReceipts.map((receipt) => [receipt.evidenceType, receipt]));
const vendorProof = receiptsByType.get("vendor-risk");
const recipientProof = receiptsByType.get("recipient-match");
const sanctionsProof = receiptsByType.get("sanctions-screen");
const deliveryProof = receiptsByType.get("delivery-attestation");
```

Hard block when:

```ts
!recipientMatches || intent.riskProfile === "high" || extraction.fields.vendorRisk === "high" || sanctionsProof?.summary.toLowerCase().includes("hit")
```

Review when no sanctions proof, stale delivery proof, or weak delivery proof without hard fraud:

```ts
if (!vendorProof || !recipientProof || !sanctionsProof || extraction.confidence < 0.65 || deliveryProof?.stale || (deliveryProof && deliveryProof.confidence < 0.65)) {
  return {
    decision: "REVIEW",
    approvedAmount: 0,
    currency: intent.currency,
    policyVersion: POLICY_VERSION,
    reasons: ["Required paid proof is missing, stale, or below confidence threshold."],
    checks,
  };
}
```

Limit when high value or any key confidence is below strong threshold.

Checks must include labels:

- `Vendor risk proof`
- `Recipient match`
- `Sanctions screen`
- `Delivery attestation`
- `Capital exposure`

- [ ] **Step 6: Update clearance orchestration**

In `clearance.ts`, import `ProofEvidenceType` and `requestProofEvidence`.

Add:

```ts
const plannedTypes = proofPlan.steps.map((step) => step.evidenceType);
const purchasedTypes = scenarioId === "block" ? plannedTypes.filter((type) => type !== "delivery-attestation") : plannedTypes;
const skippedTypes = plannedTypes.filter((type) => !purchasedTypes.includes(type));
const unpaidByType = Object.fromEntries(plannedTypes.map((evidenceType) => [evidenceType, requestProofEvidence({ intent: fixture.intent, evidenceType, paid: false })]));
const paidByType = Object.fromEntries(purchasedTypes.map((evidenceType) => [evidenceType, requestProofEvidence({ intent: fixture.intent, evidenceType, paid: true, paymentMode: "deterministic-fallback" })]));
const proofReceipts = Object.values(paidByType).flatMap((result) => result.status === 200 ? [result.receipt] : []);
```

Keep `proofGate.unpaid` and `proofGate.paid` pointing at `vendor-risk` for backward compatibility.

After policy, compute:

```ts
const proofSpendUsd = proofReceipts.reduce((sum, receipt) => sum + receipt.quotedCostUsd, 0);
const proofEconomics = {
  proofSpendUsd,
  capitalRequested: fixture.intent.amount,
  capitalApproved: policyDecision.approvedAmount,
  capitalControlled: Math.max(fixture.intent.amount - policyDecision.approvedAmount, 0),
  proofsPurchased: proofReceipts.map((receipt) => receipt.evidenceType),
  proofsSkipped: skippedTypes,
};
```

- [ ] **Step 7: Update ledger builder**

Change `buildRunLedger` input to accept `unpaidByType`, `proofReceipts`, `policyDecision`, `packetHash`, and `proofEconomics`.

For each unpaid proof result, push `PROOF_PAYMENT_REQUIRED`.

For each paid receipt, push `PROOF_RECEIPT_CREATED`.

For skipped proofs, push a `PROOF_RECEIPT_CREATED` event with payload:

```ts
{ proofReceiptId: null, evidenceType, skipped: true, reason: "Hard-risk signal stopped further proof spend." }
```

Policy payload should include:

```ts
{ decision: input.policyDecision, proofSpendUsd: input.proofEconomics.proofSpendUsd, capitalControlled: input.proofEconomics.capitalControlled }
```

- [ ] **Step 8: Restore economics from persistence**

In `persistence.ts`, when loading older records that lack economics, compute from receipts and policy:

```ts
const loadedReceipts = receipts.map((receipt) => receipt.payload as ProofReceipt);
const policyDecision = run.policyDecision as ClearanceRunRecord["policyDecision"];
const intentPayload = intent.payload as ClearanceRunRecord["intent"];
const proofEconomics = {
  proofSpendUsd: loadedReceipts.reduce((sum, receipt) => sum + receipt.quotedCostUsd, 0),
  capitalRequested: intentPayload.amount,
  capitalApproved: policyDecision.approvedAmount,
  capitalControlled: Math.max(intentPayload.amount - policyDecision.approvedAmount, 0),
  proofsPurchased: loadedReceipts.map((receipt) => receipt.evidenceType),
  proofsSkipped: [],
};
```

- [ ] **Step 9: Run focused tests**

```bash
pnpm test src/lib/disburseguard/policy.test.ts src/lib/disburseguard/clearance.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/disburseguard/proof-plan.ts src/lib/disburseguard/policy.ts src/lib/disburseguard/clearance-types.ts src/lib/disburseguard/clearance.ts src/lib/disburseguard/persistence.ts src/lib/disburseguard/policy.test.ts src/lib/disburseguard/clearance.test.ts
git commit -m "Orchestrate multi-proof treasury decisions"
```

---

### Task 4: Judge-Facing Proof Marketplace UI

**Files:**
- Modify: `src/app/demo/demo-client.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/e2e/demo-ledger.spec.ts`

- [ ] **Step 1: Update Playwright expectations**

In `tests/e2e/demo-ledger.spec.ts`, add before click:

```ts
await expect(page.getByRole("heading", { name: "Proof Marketplace" })).toBeVisible();
```

After click, assert:

```ts
await expect(page.getByText("Agent bought")).toBeVisible();
await expect(page.getByText("recipient-match")).toBeVisible();
await expect(page.getByText("sanctions-screen")).toBeVisible();
await expect(page.getByText("delivery-attestation")).toBeVisible();
```

- [ ] **Step 2: Add Proof Marketplace section**

In `demo-client.tsx`, derive:

```ts
const marketplaceRows = run
  ? run.proofPlan.steps.map((step) => {
      const receipt = run.proofReceipts.find((candidate) => candidate.evidenceType === step.evidenceType);
      const skipped = run.proofEconomics.proofsSkipped.includes(step.evidenceType);
      return { step, receipt, skipped };
    })
  : [];
```

Add a section after Proof Wall:

```tsx
<section className="surface-panel animate-panel">
  <div className="panel-heading compact">
    <div>
      <p className="eyebrow">Proof Marketplace</p>
      <h2>{run ? `Agent bought ${run.proofEconomics.proofsPurchased.length} proofs for $${run.proofEconomics.proofSpendUsd.toFixed(2)}` : "Proof budget not spent yet"}</h2>
    </div>
    <span className="status-pill border-[var(--dg-amber)]/50 bg-[var(--dg-amber)]/15 text-[var(--dg-amber)]">
      x402-gated
    </span>
  </div>
  <div className="marketplace-grid">
    {marketplaceRows.map(({ step, receipt, skipped }) => (
      <article className={receipt ? "marketplace-row paid" : skipped ? "marketplace-row skipped" : "marketplace-row"} key={step.evidenceType}>
        <span>{step.evidenceType}</span>
        <strong>{receipt ? "paid receipt" : skipped ? "skipped" : "402 required"}</strong>
        <p>{receipt?.summary ?? step.reason}</p>
        <code>{receipt ? receipt.receiptHash.slice(0, 20) : step.x402Resource}...</code>
      </article>
    ))}
  </div>
</section>
```

For initial state, render planned proof names from `activeScenario` can wait until run; the heading is enough for pre-run.

- [ ] **Step 3: Update Treasury Verdict copy**

In `getJudgeSummary`, for `LIMIT` return:

```ts
body: `The agent acquired multiple paid proofs, spent ${formatUsd(run.proofEconomics.proofSpendUsd)}, and capped authorization while preserving the signed audit trail.`
```

Add helper:

```ts
function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
```

- [ ] **Step 4: Add CSS**

In `globals.css`, add:

```css
.marketplace-grid {
  margin-top: 18px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.marketplace-row {
  min-height: 150px;
  border: 1px solid rgb(255 255 255 / 0.09);
  background: rgb(0 0 0 / 0.18);
  padding: 12px;
}

.marketplace-row.paid {
  border-color: color-mix(in srgb, var(--dg-forest-bright) 45%, white 5%);
}

.marketplace-row.skipped {
  border-color: color-mix(in srgb, var(--dg-amber) 45%, white 5%);
}

.marketplace-row span {
  color: var(--dg-metal);
  font-family: var(--font-geist-mono), monospace;
  font-size: 12px;
  font-weight: 800;
}

.marketplace-row strong {
  margin-top: 8px;
  display: block;
  color: white;
  font-size: 15px;
}

.marketplace-row p {
  margin-top: 8px;
  color: var(--dg-muted);
  font-size: 12px;
  line-height: 1.45;
}

.marketplace-row code {
  margin-top: 10px;
  display: block;
  overflow-wrap: anywhere;
  color: var(--dg-metal);
  font-family: var(--font-geist-mono), monospace;
  font-size: 11px;
}
```

At `max-width: 1180px`, set two columns. At `max-width: 760px`, set one column.

- [ ] **Step 5: Run Playwright**

```bash
pnpm exec playwright test
```

Expected: PASS on desktop and mobile.

- [ ] **Step 6: Commit**

```bash
git add src/app/demo/demo-client.tsx src/app/globals.css tests/e2e/demo-ledger.spec.ts
git commit -m "Add proof marketplace demo UI"
```

---

### Task 5: Full Verification And Deployment Readiness

**Files:**
- Modify: `docs/submission/copy.md`
- Modify: `README.md`

- [ ] **Step 1: Update submission copy**

In `docs/submission/copy.md`, update long description to mention:

```md
The upgraded proof marketplace lets the agent buy vendor-risk, recipient-match, sanctions-screen, and delivery-attestation proofs through x402-style gates. The demo reports proof spend, skipped proof spend, capital requested, capital approved, and capital controlled.
```

Add tags:

```md
proof marketplace, sanctions screening, recipient verification
```

- [ ] **Step 2: Update README sponsor usage**

In README, change x402 bullet to:

```md
- **x402 Payments:** multiple proof endpoints are protected by HTTP 402-style payment gates. The agent receives quotes, buys deterministic fallback receipts, and can stop proof spend after a hard-risk signal.
```

- [ ] **Step 3: Run complete checks**

```bash
git status --short
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
git grep -n -I -E 'AIza|sk-[A-Za-z0-9]|OPENROUTER_API_KEY=.+[^<]|GEMINI_API_KEY=.+[^<]|SIGNING_PRIVATE_KEY_HEX=.+[^<]|PRIVATE KEY|seed phrase|wallet key|password=.+' -- ':!pnpm-lock.yaml' ':!.env.local' ':!.env'
```

Expected:

- Only intended files modified before commit.
- Typecheck passes.
- Unit tests pass.
- Build passes.
- Playwright passes.
- Secret scan reports only documentation or env variable names, not real secrets.

- [ ] **Step 4: Browser smoke**

Run local dev server:

```bash
pnpm dev
```

Open `http://localhost:3000/demo` with Browser and verify visible text:

- `Proof Marketplace`
- `Agent bought`
- `HTTP 402 required`
- `valid chain`

Stop the dev server after verification.

- [ ] **Step 5: Commit docs**

```bash
git add README.md docs/submission/copy.md
git commit -m "Update multi-proof submission positioning"
```

---

## Self-Review

- Spec coverage: proof types, endpoints, orchestration, policy, UI, tests, docs, and non-goals are covered.
- Placeholder scan: no open placeholders remain; route and code snippets are concrete.
- Type consistency: `ProofEvidenceType`, `proofEconomics`, `requestProofEvidence`, and route evidence type names are consistent across tasks.
