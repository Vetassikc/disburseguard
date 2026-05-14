import { NextResponse } from "next/server";

import { listPayoutIntents } from "@/lib/disburseguard/clearance";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ intents: listPayoutIntents() });
}
