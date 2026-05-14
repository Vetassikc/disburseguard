"use client";

import { BadgeCheck, Ban, CircleDollarSign, FileCheck2, KeyRound, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ScenarioId } from "@/lib/disburseguard/contracts";
import type { ClearanceRunRecord, ClearanceVerification } from "@/lib/disburseguard/clearance-types";

const scenarios: Array<{ id: ScenarioId; label: string; amount: string; expected: string }> = [
  { id: "limit", label: "High-value hardware reserve", amount: "$75,000", expected: "LIMIT" },
  { id: "block", label: "Recipient mismatch", amount: "$31,800", expected: "BLOCK" },
  { id: "clear", label: "Verified consulting invoice", amount: "$18,400", expected: "CLEAR" },
  { id: "review", label: "Stale vendor evidence", amount: "$22,100", expected: "REVIEW" },
];

const agentRows = [
  { name: "Intake Agent", icon: FileCheck2 },
  { name: "Proof Agent", icon: ReceiptText },
  { name: "Payment/Quote Agent", icon: CircleDollarSign },
  { name: "Policy Guard", icon: ShieldCheck },
  { name: "Audit Agent", icon: KeyRound },
];

export function DemoClient() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("limit");
  const [run, setRun] = useState<ClearanceRunRecord | null>(null);
  const [verification, setVerification] = useState<ClearanceVerification | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runClearance() {
    setIsRunning(true);
    setError(null);
    setVerification(null);

    try {
      const response = await fetch("/api/clearance/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (!response.ok) {
        throw new Error(`Clearance failed with ${response.status}`);
      }
      const nextRun = (await response.json()) as ClearanceRunRecord;
      setRun(nextRun);

      const verifyResponse = await fetch(`/api/clearance/${nextRun.clearanceId}/verify`);
      setVerification((await verifyResponse.json()) as ClearanceVerification);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clearance run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  const activeScenario = useMemo(() => scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0], [scenarioId]);
  const decisionTone = getDecisionTone(run?.policyDecision.decision);

  return (
    <main className="min-h-screen bg-[var(--dg-bg)] text-[var(--dg-text)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dg-metal)]">DisburseGuard</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-white md:text-5xl">
              Proof-Paid Treasury Firewall
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--dg-muted)] md:text-base">
              No proof, no payout. The agent must buy, verify, sign, and ledger proof before company money can move.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="status-pill border-[var(--dg-forest)]/50 bg-[var(--dg-forest)]/15 text-[var(--dg-forest-bright)]">
              {run?.ledgerBackend ?? "memory-dev-ledger"}
            </span>
            <Link className="control-button secondary" href="/ledger">
              <ShieldCheck size={16} />
              Ledger
            </Link>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="space-y-5">
            <section className="surface-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Payout Intent</p>
                  <h2>{activeScenario.label}</h2>
                </div>
                <button className="control-button primary" onClick={runClearance} disabled={isRunning}>
                  {isRunning ? <Loader2 className="animate-spin" size={17} /> : <CircleDollarSign size={17} />}
                  Run clearance
                </button>
              </div>
              <div className="scenario-grid">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={scenario.id === scenarioId ? "scenario-option active" : "scenario-option"}
                    onClick={() => setScenarioId(scenario.id)}
                    type="button"
                  >
                    <span>{scenario.label}</span>
                    <strong>{scenario.amount}</strong>
                    <small>{scenario.expected}</small>
                  </button>
                ))}
              </div>
              {error ? <p className="mt-4 text-sm text-[var(--dg-oxblood-bright)]">{error}</p> : null}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="surface-panel">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">Gemini Extraction</p>
                    <h2>{run ? run.extraction.fields.vendorName : "Waiting for payout package"}</h2>
                  </div>
                  <span className="status-pill border-[var(--dg-amber)]/50 bg-[var(--dg-amber)]/15 text-[var(--dg-amber)]">
                    {run?.extraction.mode ?? "fixture-ready"}
                  </span>
                </div>
                {run ? (
                  <dl className="fact-grid">
                    <Fact label="Invoice" value={run.extraction.fields.invoiceId} />
                    <Fact label="Amount" value={`${run.extraction.fields.currency} ${run.extraction.fields.amount.toLocaleString()}`} />
                    <Fact label="Recipient" value={run.extraction.fields.recipientName} />
                    <Fact label="Confidence" value={`${Math.round(run.extraction.confidence * 100)}%`} />
                  </dl>
                ) : (
                  <p className="empty-copy">Select a scenario and run clearance.</p>
                )}
              </div>

              <div className="surface-panel">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">x402 Proof Gate</p>
                    <h2>{run?.proofGate.unpaid.status === 402 ? "402 Payment Required" : "Awaiting proof request"}</h2>
                  </div>
                  <span className="status-pill border-white/15 bg-white/8 text-white">
                    {run?.proofGate.paid.status === 200 ? "fallback-paid" : "unpaid"}
                  </span>
                </div>
                {run?.proofGate.unpaid.status === 402 ? (
                  <div className="proof-gate">
                    <div>
                      <span>Resource</span>
                      <strong>{run.proofGate.unpaid.paymentRequired.resource}</strong>
                    </div>
                    <div>
                      <span>Quote</span>
                      <strong>${run.proofGate.unpaid.paymentRequired.quotedCostUsd.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Scheme</span>
                      <strong>{run.proofGate.unpaid.paymentRequired.scheme}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="empty-copy">Proof access is blocked until payment metadata is returned.</p>
                )}
              </div>
            </section>

            <section className="surface-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Decision Trail</p>
                  <h2 className={decisionTone.className}>{run?.policyDecision.decision ?? "Not run"}</h2>
                </div>
                <span className="decision-amount">
                  {run ? `${run.policyDecision.currency} ${run.policyDecision.approvedAmount.toLocaleString()}` : "USD 0"}
                </span>
              </div>
              <div className="decision-grid">
                {(run?.policyDecision.checks ?? []).map((check) => (
                  <div className="check-row" key={check.label}>
                    <span className={`check-dot ${check.status}`} />
                    <div>
                      <strong>{check.label}</strong>
                      <p>{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="surface-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Agent Status</p>
                  <h2>{run ? "Complete" : isRunning ? "Running" : "Queued"}</h2>
                </div>
                <BadgeCheck className="text-[var(--dg-forest-bright)]" size={22} />
              </div>
              <div className="agent-list">
                {agentRows.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <div className="agent-row" key={agent.name}>
                      <Icon size={17} />
                      <span>{agent.name}</span>
                      <strong>{run ? "Complete" : isRunning ? "Running" : "Queued"}</strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="surface-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Proof Receipts</p>
                  <h2>{run?.proofReceipts.length ?? 0} receipt</h2>
                </div>
                <ReceiptText size={21} />
              </div>
              <div className="receipt-list">
                {(run?.proofReceipts ?? []).map((receipt) => (
                  <article className="receipt-card" key={receipt.id}>
                    <div className="flex items-start justify-between gap-3">
                      <strong>{receipt.evidenceType}</strong>
                      <span>{Math.round(receipt.confidence * 100)}%</span>
                    </div>
                    <p>{receipt.summary}</p>
                    <code>{receipt.evidenceHash.slice(0, 18)}...</code>
                  </article>
                ))}
                {!run ? <p className="empty-copy">No proof receipt yet.</p> : null}
              </div>
            </section>

            <section className="surface-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Clearance Packet</p>
                  <h2>{run?.packet.id ?? "Unsigned"}</h2>
                </div>
                {run?.policyDecision.decision === "BLOCK" ? <Ban size={21} /> : <KeyRound size={21} />}
              </div>
              {run ? (
                <dl className="packet-grid">
                  <Fact label="Signature" value={`${run.packet.signature.slice(0, 18)}...`} />
                  <Fact label="Packet hash" value={`${run.packet.packetHash.slice(0, 18)}...`} />
                  <Fact label="Signing" value={run.packet.signingMode} />
                  <Fact label="Verify" value={verification?.eventChainValid ? "valid chain" : "pending"} />
                </dl>
              ) : (
                <p className="empty-copy">Packet appears after policy decision.</p>
              )}
            </section>
          </aside>
        </section>

        <section className="surface-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Ledger Timeline</p>
              <h2>{run?.clearanceId ?? "No active run"}</h2>
            </div>
            {verification?.eventChainValid ? (
              <span className="status-pill border-[var(--dg-forest)]/50 bg-[var(--dg-forest)]/15 text-[var(--dg-forest-bright)]">verified</span>
            ) : (
              <span className="status-pill border-[var(--dg-amber)]/50 bg-[var(--dg-amber)]/15 text-[var(--dg-amber)]">pending</span>
            )}
          </div>
          <div className="timeline">
            {(run?.ledgerEvents ?? []).map((event) => (
              <div className="timeline-event" key={event.id}>
                <span />
                <div>
                  <strong>{event.eventType.replaceAll("_", " ")}</strong>
                  <p>{event.actor}</p>
                  <code>{event.eventHash.slice(0, 20)}...</code>
                </div>
              </div>
            ))}
            {!run ? (
              <div className="timeline-event">
                <span />
                <div>
                  <strong>Awaiting payout intent</strong>
                  <p>Run clearance to create append-only events.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getDecisionTone(decision?: string) {
  if (decision === "CLEAR") return { className: "text-[var(--dg-forest-bright)]" };
  if (decision === "LIMIT") return { className: "text-[var(--dg-amber)]" };
  if (decision === "REVIEW") return { className: "text-[var(--dg-metal)]" };
  if (decision === "BLOCK") return { className: "text-[var(--dg-oxblood-bright)]" };
  return { className: "text-white" };
}
