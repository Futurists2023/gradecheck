import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonitoringClusterDetail } from "@/lib/monitoring-queries";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { absoluteUrl } from "@/lib/utils";
import { MONITORED_ROUTE_TYPES } from "@/lib/monitoring";
import type { MonitoringRouteType } from "@/types/monitoring";

type MonitoringClusterDetailPageProps = {
  params: {
    cluster: string;
  };
};

export async function generateMetadata({ params }: MonitoringClusterDetailPageProps): Promise<Metadata> {
  return {
    title: `Monitoring cluster ${params.cluster}`,
    alternates: {
      canonical: absoluteUrl(`/internal/monitoring/clusters/${params.cluster}`),
    },
    robots: NOINDEX_FOLLOW_ROBOTS,
  };
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function MonitoringClusterDetailPage({
  params,
}: MonitoringClusterDetailPageProps) {
  if (!MONITORED_ROUTE_TYPES.includes(params.cluster as MonitoringRouteType)) {
    notFound();
  }

  const routeType = params.cluster as MonitoringRouteType;
  const detail = await getMonitoringClusterDetail(routeType);
  const latestReview = detail.latest30DayReview;

  return (
    <div className="container-shell space-y-8">
      <section className="surface p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          Cluster detail
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold capitalize">{routeType}</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          {latestReview
            ? `Latest verdict: ${latestReview.recommended_verdict}. Review date: ${latestReview.review_date}.`
            : "This cluster route is valid, but monitoring reviews have not been generated yet for it."}
        </p>
      </section>

      {latestReview ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Indexed rate</CardTitle>
              </CardHeader>
              <CardContent>{formatPercent(latestReview.metrics.indexedRate)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CTR</CardTitle>
              </CardHeader>
              <CardContent>{formatPercent(latestReview.metrics.ctr)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next-step rate</CardTitle>
              </CardHeader>
              <CardContent>{formatPercent(latestReview.metrics.nextStepRate)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low-value exit</CardTitle>
              </CardHeader>
              <CardContent>{formatPercent(latestReview.metrics.lowValueExitRate)}</CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Trend snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.dailyTrend.map((day) => (
                  <div key={day.snapshot_date} className="grid gap-1 border-b border-border pb-3 text-sm text-muted-foreground last:border-0 last:pb-0 md:grid-cols-5">
                    <span>{day.snapshot_date}</span>
                    <span>{day.impressions} impressions</span>
                    <span>{day.clicks} clicks</span>
                    <span>{day.sessions} sessions</span>
                    <span>{day.next_step_sessions} next-step sessions</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Action: {latestReview.recommended_action ?? "None"}</p>
                <p>Reasons: {latestReview.reason_codes.join(", ") || "None"}</p>
                <p>Grow rules: {latestReview.triggered_rules.grow.join(", ") || "None"}</p>
                <p>Prune rules: {latestReview.triggered_rules.prune.join(", ") || "None"}</p>
                <p>Deindex rules: {latestReview.triggered_rules.deindex.join(", ") || "None"}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {detail.topPages.map((page) => (
                  <div key={`${page.snapshot_date}-${page.href}`} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold text-foreground">{page.href}</p>
                    <p>
                      {page.snapshot_date} | {page.clicks} clicks | {page.impressions} impressions
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weak pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {detail.weakPages.map((page) => (
                  <div key={`${page.snapshot_date}-${page.href}`} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold text-foreground">{page.href}</p>
                    <p>
                      {page.snapshot_date} | {page.low_value_exit_sessions} low-value exits | {page.clicks} clicks
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Approval history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {detail.approvalHistory.length > 0 ? (
                  detail.approvalHistory.map((item) => (
                    <div key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <p className="font-semibold capitalize text-foreground">
                        {item.actionType} | {item.decision}
                      </p>
                      <p>
                        {item.createdAt} | {item.actor} | effective {item.effectiveFrom}
                      </p>
                      {item.note ? <p>Note: {item.note}</p> : null}
                    </div>
                  ))
                ) : (
                  <p>No approval history yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval action</CardTitle>
              </CardHeader>
              <CardContent>
                {latestReview.recommended_action ? (
                  <form action="/internal/monitoring/actions" method="post" className="space-y-4">
                    <input type="hidden" name="route_type" value={routeType} />
                    <input type="hidden" name="action_type" value={latestReview.recommended_action} />
                    <input type="hidden" name="review_date" value={latestReview.review_date} />
                    <label className="block text-sm text-muted-foreground">
                      Note
                      <textarea
                        name="note"
                        className="mt-2 min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground"
                        placeholder="Optional approval note"
                      />
                    </label>
                    <label className="block text-sm text-muted-foreground">
                      Expires on
                      <input
                        type="date"
                        name="expires_on"
                        className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        name="decision"
                        value="approved"
                        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                      >
                        Approve
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="rejected"
                        className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">No action is currently recommended.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <section className="surface p-8">
          <h2 className="font-serif text-3xl font-semibold">No monitoring data yet</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This cluster page is valid, but the monitoring pipeline has not produced rollups and reviews
            for it yet. Run the monitoring sequence to populate data:
            {" "}`monitoring:build-catalog`, `monitoring:rollup`, and `monitoring:review`.
          </p>
        </section>
      )}
    </div>
  );
}
