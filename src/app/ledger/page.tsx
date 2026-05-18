import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { listClearanceRunsWithPersistence } from "@/lib/disburseguard/clearance";
import { verifyLedgerChain } from "@/lib/disburseguard/ledger";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const runs = await listClearanceRunsWithPersistence();

  return (
    <main className="min-h-screen bg-[var(--dg-bg)] px-4 py-6 text-[var(--dg-text)] lg:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Verification History</p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">Ledger</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--dg-muted)]">
              Signed clearance packets and append-only event chains recorded by the audit layer.
            </p>
          </div>
          <Link className="control-button secondary" href="/demo">
            <ShieldCheck size={16} />
            Demo
          </Link>
        </header>

        {runs.length === 0 ? (
          <section className="surface-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">No ledger events</p>
                <h2>Run a payout clearance first</h2>
              </div>
              <AlertTriangle className="text-[var(--dg-amber)]" size={24} />
            </div>
          </section>
        ) : (
          <section className="ledger-list">
            {runs.map((run) => {
              const chain = verifyLedgerChain(run.ledgerEvents);
              return (
                <article className="surface-panel" key={run.clearanceId}>
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">{run.clearanceId}</p>
                      <h2>{run.intent.vendorName}</h2>
                    </div>
                    <span className="status-pill border-[var(--dg-forest)]/50 bg-[var(--dg-forest)]/15 text-[var(--dg-forest-bright)]">
                      {chain.valid ? "valid chain" : "invalid chain"}
                    </span>
                  </div>
                  <div className="ledger-grid">
                    <div>
                      <span>Decision</span>
                      <strong>{run.policyDecision.decision}</strong>
                    </div>
                    <div>
                      <span>Packet</span>
                      <code>{run.packet.packetHash.slice(0, 22)}...</code>
                    </div>
                    <div>
                      <span>Last event</span>
                      <code>{chain.lastEventHash?.slice(0, 22) ?? "none"}...</code>
                    </div>
                    <div>
                      <span>Backend</span>
                      <strong>{run.ledgerBackend}</strong>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {run.ledgerEvents.map((event) => (
                      <div className="ledger-event" key={event.id}>
                        <CheckCircle2 size={16} />
                        <div>
                          <strong>{event.eventType.replaceAll("_", " ")}</strong>
                          <code>{event.eventHash.slice(0, 18)}...</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
