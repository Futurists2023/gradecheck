import "server-only";

import pool from "@/lib/db";
import { ensureMonitoringTables } from "@/pipeline/monitoring";
import type {
  MonitoringActionType,
  MonitoringApprovalDecision,
  MonitoringClusterDailyRollup,
  MonitoringClusterDetail,
  MonitoringClusterListItem,
  MonitoringOverview,
  MonitoringReviewRecord,
  MonitoringRouteType,
  MonitoringVerdict,
} from "@/types/monitoring";

type LatestReviewRow = {
  review_date: string;
  route_type: MonitoringRouteType;
  window_days: number;
  metrics: string;
  previous_metrics: string | null;
  gates: string;
  triggered_rules: string;
  reason_codes: string;
  recommended_verdict: MonitoringVerdict;
  recommended_action: MonitoringActionType | null;
};

function parseReviewRow(row: LatestReviewRow): MonitoringReviewRecord {
  return {
    review_date: row.review_date,
    route_type: row.route_type,
    template_cluster: row.route_type,
    window_days: row.window_days,
    metrics: JSON.parse(row.metrics),
    previous_metrics: row.previous_metrics ? JSON.parse(row.previous_metrics) : null,
    gates: JSON.parse(row.gates),
    triggered_rules: JSON.parse(row.triggered_rules),
    reason_codes: JSON.parse(row.reason_codes),
    recommended_verdict: row.recommended_verdict,
    recommended_action: row.recommended_action,
  };
}

export async function getMonitoringOverview(): Promise<MonitoringOverview> {
  const client = await pool.connect();

  try {
    await ensureMonitoringTables(client);
    const freshnessResult = await client.query<{
      latest_review_date: string | null;
      latest_gsc_date: string | null;
      latest_ga4_date: string | null;
      latest_action_event_at: string | null;
    }>(`
      SELECT
        (SELECT MAX(review_date)::text FROM monitoring_cluster_reviews) AS latest_review_date,
        (SELECT MAX(snapshot_date)::text FROM monitoring_gsc_daily) AS latest_gsc_date,
        (SELECT MAX(snapshot_date)::text FROM monitoring_ga4_daily) AS latest_ga4_date,
        (SELECT MAX(occurred_at)::text FROM monitoring_action_events) AS latest_action_event_at
    `);
    const verdictResult = await client.query<{
      route_type: MonitoringRouteType;
      recommended_verdict: MonitoringVerdict;
      total: number;
    }>(`
      WITH latest_reviews AS (
        SELECT DISTINCT ON (route_type)
          route_type,
          recommended_verdict,
          review_date
        FROM monitoring_cluster_reviews
        WHERE window_days = 30
        ORDER BY route_type, review_date DESC
      )
      SELECT route_type, recommended_verdict, COUNT(*)::int AS total
      FROM latest_reviews
      GROUP BY route_type, recommended_verdict
      ORDER BY route_type, recommended_verdict
    `);
    const pendingResult = await client.query<{
      route_type: MonitoringRouteType;
      recommended_verdict: MonitoringVerdict;
      recommended_action: MonitoringActionType;
      reason_codes: string;
      review_date: string;
    }>(`
      WITH latest_reviews AS (
        SELECT DISTINCT ON (route_type)
          route_type,
          recommended_verdict,
          recommended_action,
          reason_codes,
          review_date
        FROM monitoring_cluster_reviews
        WHERE window_days = 30
          AND recommended_action IS NOT NULL
        ORDER BY route_type, review_date DESC
      ),
      latest_approvals AS (
        SELECT DISTINCT ON (route_type)
          route_type,
          created_at,
          decision
        FROM monitoring_action_approvals
        ORDER BY route_type, created_at DESC
      )
      SELECT
        latest_reviews.route_type,
        latest_reviews.recommended_verdict,
        latest_reviews.recommended_action,
        latest_reviews.reason_codes::text,
        latest_reviews.review_date::text
      FROM latest_reviews
      LEFT JOIN latest_approvals
        ON latest_approvals.route_type = latest_reviews.route_type
      WHERE latest_approvals.created_at IS NULL
         OR latest_approvals.created_at::date < latest_reviews.review_date
      ORDER BY latest_reviews.route_type
    `);
    const approvalsResult = await client.query<{
      route_type: MonitoringRouteType;
      action_type: MonitoringActionType;
      decision: MonitoringApprovalDecision;
      actor: string;
      effective_from: string;
      expires_on: string | null;
    }>(`
      SELECT DISTINCT ON (route_type)
        route_type,
        action_type,
        decision,
        actor,
        effective_from::text,
        expires_on::text
      FROM monitoring_action_approvals
      ORDER BY route_type, effective_from DESC, created_at DESC
    `);

    const freshness = freshnessResult.rows[0] ?? {
      latest_review_date: null,
      latest_gsc_date: null,
      latest_ga4_date: null,
      latest_action_event_at: null,
    };

    return {
      latestReviewDate: freshness.latest_review_date,
      latestGscDate: freshness.latest_gsc_date,
      latestGa4Date: freshness.latest_ga4_date,
      latestActionEventAt: freshness.latest_action_event_at,
      verdictCounts: verdictResult.rows.map((row) => ({
        routeType: row.route_type,
        verdict: row.recommended_verdict,
        total: row.total,
      })),
      pendingApprovals: pendingResult.rows.map((row) => ({
        routeType: row.route_type,
        verdict: row.recommended_verdict,
        actionType: row.recommended_action,
        reasonCodes: JSON.parse(row.reason_codes),
        reviewDate: row.review_date,
      })),
      activeApprovals: approvalsResult.rows.map((row) => ({
        routeType: row.route_type,
        actionType: row.action_type,
        decision: row.decision,
        actor: row.actor,
        effectiveFrom: row.effective_from,
        expiresOn: row.expires_on,
      })),
    };
  } finally {
    client.release();
  }
}

export async function getMonitoringClusterList(filters: {
  routeType?: MonitoringRouteType | "all";
  verdict?: MonitoringVerdict | "all";
} = {}): Promise<MonitoringClusterListItem[]> {
  const values: string[] = [];
  const where: string[] = ["window_days = 30"];

  if (filters.routeType && filters.routeType !== "all") {
    values.push(filters.routeType);
    where.push(`route_type = $${values.length}`);
  }

  if (filters.verdict && filters.verdict !== "all") {
    values.push(filters.verdict);
    where.push(`recommended_verdict = $${values.length}`);
  }

  const client = await pool.connect();

  try {
    await ensureMonitoringTables(client);
    const result = await client.query<LatestReviewRow>(
      `
      SELECT DISTINCT ON (route_type)
        review_date::text,
        route_type,
        window_days,
        metrics::text,
        previous_metrics::text,
        gates::text,
        triggered_rules::text,
        reason_codes::text,
        recommended_verdict,
        recommended_action
      FROM monitoring_cluster_reviews
      WHERE ${where.join(" AND ")}
      ORDER BY route_type, review_date DESC
      `,
      values,
    );

    return result.rows
      .map(parseReviewRow)
      .map((review) => ({
        routeType: review.route_type,
        verdict: review.recommended_verdict,
        actionType: review.recommended_action,
        reviewDate: review.review_date,
        indexedRate: review.metrics.indexedRate,
        impressionsPerIndexedPage: review.metrics.impressionsPerIndexedPage,
        clicksPerIndexedPage: review.metrics.clicksPerIndexedPage,
        ctr: review.metrics.ctr,
        goodEngagementRate: review.metrics.goodEngagementRate,
        nextStepRate: review.metrics.nextStepRate,
        lowValueExitRate: review.metrics.lowValueExitRate,
        reasonCodes: review.reason_codes,
      }));
  } finally {
    client.release();
  }
}

export async function getMonitoringClusterDetail(
  routeType: MonitoringRouteType,
): Promise<MonitoringClusterDetail> {
  const client = await pool.connect();

  try {
    await ensureMonitoringTables(client);
    const reviewResult = await client.query<LatestReviewRow>(
      `
        SELECT
          review_date::text,
          route_type,
          window_days,
          metrics::text,
          previous_metrics::text,
          gates::text,
          triggered_rules::text,
          reason_codes::text,
          recommended_verdict,
          recommended_action
        FROM monitoring_cluster_reviews
        WHERE route_type = $1
        ORDER BY review_date DESC, window_days ASC
      `,
      [routeType],
    );
    const trendResult = await client.query<MonitoringClusterDailyRollup & { snapshot_date: string }>(
      `
        SELECT
          snapshot_date::text,
          route_type,
          template_cluster,
          intended_index_pages,
          effective_index_pages,
          submitted_pages,
          indexed_pages,
          impressions,
          clicks,
          ctr,
          average_position,
          sessions,
          engaged_sessions,
          views,
          next_step_sessions,
          low_value_exit_sessions,
          source_click_sessions,
          page_view_sessions
        FROM monitoring_cluster_daily_rollups
        WHERE route_type = $1
        ORDER BY snapshot_date DESC
        LIMIT 14
      `,
      [routeType],
    );
    const topPagesResult = await client.query<any>(
      `
        SELECT
          snapshot_date::text,
          href,
          route_type,
          template_cluster,
          intended_index_state,
          current_effective_index_state,
          submitted_pages,
          indexed_pages,
          impressions,
          clicks,
          ctr,
          average_position,
          sessions,
          engaged_sessions,
          views,
          next_step_sessions,
          low_value_exit_sessions,
          source_click_sessions,
          page_view_sessions
        FROM monitoring_page_daily_rollups
        WHERE route_type = $1
        ORDER BY clicks DESC, impressions DESC, snapshot_date DESC
        LIMIT 10
      `,
      [routeType],
    );
    const weakPagesResult = await client.query<any>(
      `
        SELECT
          snapshot_date::text,
          href,
          route_type,
          template_cluster,
          intended_index_state,
          current_effective_index_state,
          submitted_pages,
          indexed_pages,
          impressions,
          clicks,
          ctr,
          average_position,
          sessions,
          engaged_sessions,
          views,
          next_step_sessions,
          low_value_exit_sessions,
          source_click_sessions,
          page_view_sessions
        FROM monitoring_page_daily_rollups
        WHERE route_type = $1
        ORDER BY low_value_exit_sessions DESC, clicks ASC, snapshot_date DESC
        LIMIT 10
      `,
      [routeType],
    );
    const approvalResult = await client.query<{
      id: number;
      route_type: MonitoringRouteType;
      action_type: MonitoringActionType;
      decision: MonitoringApprovalDecision;
      actor: string;
      note: string | null;
      effective_from: string;
      expires_on: string | null;
      created_at: string;
    }>(
      `
        SELECT
          id,
          route_type,
          action_type,
          decision,
          actor,
          note,
          effective_from::text,
          expires_on::text,
          created_at::text
        FROM monitoring_action_approvals
        WHERE route_type = $1
        ORDER BY created_at DESC
      `,
      [routeType],
    );

    const latest30 = reviewResult.rows.find((row) => row.window_days === 30);
    const latest60 = reviewResult.rows.find((row) => row.window_days === 60);

    return {
      latest30DayReview: latest30 ? parseReviewRow(latest30) : null,
      latest60DayReview: latest60 ? parseReviewRow(latest60) : null,
      dailyTrend: [...trendResult.rows].reverse(),
      topPages: topPagesResult.rows,
      weakPages: weakPagesResult.rows,
      approvalHistory: approvalResult.rows.map((row) => ({
        id: row.id,
        routeType: row.route_type,
        actionType: row.action_type,
        decision: row.decision,
        actor: row.actor,
        note: row.note,
        effectiveFrom: row.effective_from,
        expiresOn: row.expires_on,
        createdAt: row.created_at,
      })),
    };
  } finally {
    client.release();
  }
}
