import { NextResponse, type NextRequest } from "next/server";

import pool from "@/lib/db";
import { MONITORED_ROUTE_TYPES } from "@/lib/monitoring";
import type {
  MonitoringActionType,
  MonitoringApprovalDecision,
  MonitoringRouteType,
} from "@/types/monitoring";

function parseActor(request: NextRequest): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return "internal-user";
  }

  try {
    const decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
    return decoded.split(":")[0] || "internal-user";
  } catch {
    return "internal-user";
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const routeType = formData.get("route_type");
  const actionType = formData.get("action_type");
  const decision = formData.get("decision");
  const note = formData.get("note");
  const reviewDate = formData.get("review_date");
  const expiresOn = formData.get("expires_on");

  if (
    typeof routeType !== "string" ||
    !MONITORED_ROUTE_TYPES.includes(routeType as MonitoringRouteType) ||
    typeof actionType !== "string" ||
    !["grow", "prune", "deindex", "investigate"].includes(actionType) ||
    typeof decision !== "string" ||
    !["approved", "rejected"].includes(decision)
  ) {
    return NextResponse.redirect(new URL(`/internal/monitoring/clusters`, request.url), 303);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO monitoring_action_approvals (
          template_cluster,
          route_type,
          action_type,
          decision,
          actor,
          note,
          review_date,
          effective_from,
          expires_on
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        routeType,
        routeType,
        actionType as MonitoringActionType,
        decision as MonitoringApprovalDecision,
        parseActor(request),
        typeof note === "string" && note.trim() ? note.trim() : null,
        typeof reviewDate === "string" && reviewDate ? reviewDate : null,
        new Date().toISOString().slice(0, 10),
        typeof expiresOn === "string" && expiresOn ? expiresOn : null,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return NextResponse.redirect(new URL(`/internal/monitoring/clusters/${routeType}`, request.url), 303);
}
