import { DemoClient } from "./demo-client";
import { getLedgerBackendLabel } from "@/lib/disburseguard/persistence";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return <DemoClient initialLedgerBackend={getLedgerBackendLabel()} />;
}
