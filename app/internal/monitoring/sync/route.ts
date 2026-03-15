import { NextResponse } from "next/server";

import { syncMonitoringFromDashboard } from "@/lib/monitoring-sync";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;

  try {
    const result = await syncMonitoringFromDashboard({ force });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Monitoring sync failed.",
      },
      { status: 500 },
    );
  }
}
