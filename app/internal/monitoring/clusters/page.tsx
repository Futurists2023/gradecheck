import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { getMonitoringClusterList } from "@/lib/monitoring-queries";
import { absoluteUrl } from "@/lib/utils";
import type { MonitoringRouteType, MonitoringVerdict } from "@/types/monitoring";

export const metadata: Metadata = {
  title: "Monitoring clusters",
  alternates: {
    canonical: absoluteUrl("/internal/monitoring/clusters"),
  },
  robots: NOINDEX_FOLLOW_ROBOTS,
};

type ClusterListPageProps = {
  searchParams?: {
    routeType?: MonitoringRouteType | "all";
    verdict?: MonitoringVerdict | "all";
  };
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function MonitoringClustersPage({ searchParams }: ClusterListPageProps) {
  const routeType = searchParams?.routeType ?? "all";
  const verdict = searchParams?.verdict ?? "all";
  const clusters = await getMonitoringClusterList({ routeType, verdict });

  return (
    <div className="container-shell space-y-8">
      <section className="surface p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          Internal monitoring
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Cluster reviews</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          Filter the monitored route clusters and inspect the latest 30-day KPI and verdict state.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clusters.length > 0 ? (
          clusters.map((cluster) => (
            <Card key={cluster.routeType}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 capitalize">
                  <span>{cluster.routeType}</span>
                  <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {cluster.verdict}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Review date: {cluster.reviewDate}</p>
                <p>Indexed rate: {formatPercent(cluster.indexedRate)}</p>
                <p>Impressions per indexed page: {cluster.impressionsPerIndexedPage.toFixed(1)}</p>
                <p>Clicks per indexed page: {cluster.clicksPerIndexedPage.toFixed(2)}</p>
                <p>CTR: {formatPercent(cluster.ctr)}</p>
                <p>Good engagement: {formatPercent(cluster.goodEngagementRate)}</p>
                <p>Next-step: {formatPercent(cluster.nextStepRate)}</p>
                <p>Low-value exit: {formatPercent(cluster.lowValueExitRate)}</p>
                {cluster.reasonCodes.length > 0 ? (
                  <p>Reasons: {cluster.reasonCodes.join(", ")}</p>
                ) : null}
                <Link href={`/internal/monitoring/clusters/${cluster.routeType}`} className="font-semibold text-primary hover:underline">
                  Open detail
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center text-muted-foreground">
            No cluster reviews match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
