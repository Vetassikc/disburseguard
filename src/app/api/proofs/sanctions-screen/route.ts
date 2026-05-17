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
    evidenceType: "sanctions-screen",
    paid: body.paid === true,
    paymentMode: body.paymentMode === "live-x402" ? "live-x402" : "deterministic-fallback",
  });

  return NextResponse.json(result, { status: result.status });
}
