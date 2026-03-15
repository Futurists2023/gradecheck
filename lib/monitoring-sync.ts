import pool from "@/lib/db";
import { fetchAndImportLiveGa4, getDefaultGa4DateRange, getGa4SyncReadiness } from "@/lib/google-ga4";
import { fetchAndImportLiveGsc, getDefaultGscDateRange } from "@/lib/google-gsc";
import { buildMonitoringPageCatalog, reviewMonitoringClusters, rollupMonitoringData } from "@/pipeline/monitoring";

const MONITORING_SYNC_LOCK_ID = 420_116;

export async function syncMonitoringFromDashboard(options: {
  force?: boolean;
} = {}) {
  const client = await pool.connect();

  try {
    const lockResult = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [MONITORING_SYNC_LOCK_ID],
    );
    const locked = lockResult.rows[0]?.locked ?? false;

    if (!locked) {
      return {
        status: "busy" as const,
      };
    }

    const freshnessResult = await client.query<{
      latest_gsc_date: string | null;
      latest_ga4_date: string | null;
      latest_review_date: string | null;
    }>(`
      SELECT
        (SELECT MAX(snapshot_date)::text FROM monitoring_gsc_daily) AS latest_gsc_date,
        (SELECT MAX(snapshot_date)::text FROM monitoring_ga4_daily) AS latest_ga4_date,
        (SELECT MAX(review_date)::text FROM monitoring_cluster_reviews) AS latest_review_date
    `);
    const freshness = freshnessResult.rows[0] ?? {
      latest_gsc_date: null,
      latest_ga4_date: null,
      latest_review_date: null,
    };
    const gscDefaults = getDefaultGscDateRange();
    const ga4Defaults = getDefaultGa4DateRange();
    const ga4Readiness = await getGa4SyncReadiness();
    const needsSync =
      options.force ||
      freshness.latest_gsc_date !== gscDefaults.endDate ||
      freshness.latest_review_date !== gscDefaults.endDate ||
      (ga4Readiness.enabled && freshness.latest_ga4_date !== ga4Defaults.endDate);

    if (!needsSync) {
      return {
        status: "up_to_date" as const,
        latestGscDate: freshness.latest_gsc_date,
        latestGa4Date: freshness.latest_ga4_date,
        latestReviewDate: freshness.latest_review_date,
      };
    }

    await buildMonitoringPageCatalog(pool);
    const gscResult = await fetchAndImportLiveGsc(pool, gscDefaults);
    const ga4Result = ga4Readiness.enabled
      ? await fetchAndImportLiveGa4(pool, ga4Defaults)
      : {
          skipped: true,
          reason: ga4Readiness.reason,
        };
    const rollupResult = await rollupMonitoringData(pool);
    const reviewResult = await reviewMonitoringClusters(pool);

    return {
      status: "synced" as const,
      gscResult,
      ga4Result,
      rollupResult,
      reviewResult,
    };
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [MONITORING_SYNC_LOCK_ID]);
    } catch {
      // Ignore unlock failures.
    }
    client.release();
  }
}
