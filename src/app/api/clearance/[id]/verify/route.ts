import { NextResponse } from "next/server";

import { verifyClearance } from "@/lib/disburseguard/clearance";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const verification = await verifyClearance(id);

  return NextResponse.json(verification, { status: verification.packetValid && verification.eventChainValid ? 200 : 404 });
}
