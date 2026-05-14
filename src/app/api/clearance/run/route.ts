import { NextResponse } from "next/server";

import { runClearanceScenario } from "@/lib/disburseguard/clearance";
import { scenarioIdSchema } from "@/lib/disburseguard/contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scenarioId = scenarioIdSchema.safeParse(body.scenarioId);

  if (!scenarioId.success) {
    return NextResponse.json({ error: "Invalid scenarioId." }, { status: 400 });
  }

  const run = await runClearanceScenario(scenarioId.data);
  return NextResponse.json(run);
}
