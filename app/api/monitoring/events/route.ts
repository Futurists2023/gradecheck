import { NextResponse, type NextRequest } from "next/server";

import pool from "@/lib/db";
import { detectMonitoringRouteType, normalizeMonitoringHref } from "@/lib/monitoring";
import { ensureMonitoringTables } from "@/pipeline/monitoring";
import type { MonitoringEventName } from "@/types/monitoring";

const ALLOWED_EVENT_NAMES = new Set<MonitoringEventName>([
  "page_view_start",
  "page_view_end",
  "leaf_click",
  "profile_open",
  "verify_open",
  "shortlist_add",
  "compare_select",
  "source_click",
]);

type MonitoringEventPayload = {
  eventName: MonitoringEventName;
  href: string;
  sessionId: string;
  occurredAt?: string;
  routeType?: string | null;
  referrerHref?: string | null;
  metadata?: Record<string, boolean | number | string | null>;
};

async function parsePayload(request: NextRequest): Promise<MonitoringEventPayload | null> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      return (await request.json()) as MonitoringEventPayload;
    }

    const text = await request.text();
    return text ? (JSON.parse(text) as MonitoringEventPayload) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const payload = await parsePayload(request);

  if (!payload || !ALLOWED_EVENT_NAMES.has(payload.eventName)) {
    return NextResponse.json({ ok: false, error: "Invalid event payload." }, { status: 400 });
  }

  const href = normalizeMonitoringHref(payload.href);
  if (!href || typeof payload.sessionId !== "string" || !payload.sessionId.trim()) {
    return NextResponse.json({ ok: false, error: "Missing href or session id." }, { status: 400 });
  }

  const referrerHref =
    typeof payload.referrerHref === "string" ? normalizeMonitoringHref(payload.referrerHref) : null;
  const routeType =
    typeof payload.routeType === "string" && payload.routeType
      ? payload.routeType
      : detectMonitoringRouteType(href);
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid occurredAt." }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureMonitoringTables(client);
    await client.query(
      `
        INSERT INTO monitoring_action_events (
          occurred_at,
          event_date,
          session_id,
          href,
          route_type,
          event_name,
          referrer_href,
          metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      `,
      [
        occurredAt.toISOString(),
        occurredAt.toISOString().slice(0, 10),
        payload.sessionId.trim(),
        href,
        routeType,
        payload.eventName,
        referrerHref,
        JSON.stringify(payload.metadata ?? {}),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: "Failed to persist event." }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
