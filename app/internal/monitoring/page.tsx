import Link from "next/link";
import type { Metadata } from "next";

import { InternalMonitoringAutoSync } from "@/components/InternalMonitoringAutoSync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getMonitoringOverview } from "@/lib/monitoring-queries";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Internal monitoring overview",
  alternates: {
    canonical: absoluteUrl("/internal/monitoring"),
  },
  robots: NOINDEX_FOLLOW_ROBOTS,
};

export default async function InternalMonitoringPage() {
  const overview = await getMonitoringOverview();

  return (
    <div className="container-shell space-y-8">
      <section className="surface p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          Internal monitoring
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">Monitoring control tower</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          Review cluster verdicts, import freshness, pending approvals, and the effective indexing
          state now driving internal sitemap and robots decisions.
        </p>
        <div className="mt-4">
          <InternalMonitoringAutoSync />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/internal/monitoring/clusters" className={buttonVariants({ variant: "default" })}>
            Open cluster reviews
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest review</CardTitle>
          </CardHeader>
          <CardContent>{overview.latestReviewDate ?? "Unavailable"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest GSC import</CardTitle>
          </CardHeader>
          <CardContent>{overview.latestGscDate ?? "Unavailable"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest GA4 import</CardTitle>
          </CardHeader>
          <CardContent>{overview.latestGa4Date ?? "Unavailable"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest action event</CardTitle>
          </CardHeader>
          <CardContent>{overview.latestActionEventAt ?? "Unavailable"}</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verdicts by cluster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.verdictCounts.length > 0 ? (
              overview.verdictCounts.map((item) => (
                <div key={`${item.routeType}-${item.verdict}`} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold capitalize">{item.routeType}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.verdict}</p>
                  </div>
                  <span className="text-lg font-semibold">{item.total}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No review records yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.pendingApprovals.length > 0 ? (
              overview.pendingApprovals.map((item) => (
                <div key={`${item.routeType}-${item.reviewDate}`} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize">{item.routeType}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.reviewDate} | {item.verdict} | {item.actionType}
                      </p>
                    </div>
                    <Link
                      href={`/internal/monitoring/clusters/${item.routeType}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Review
                    </Link>
                  </div>
                  {item.reasonCodes.length > 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Reasons: {item.reasonCodes.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No pending approval actions.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Active approvals</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.activeApprovals.length > 0 ? (
            overview.activeApprovals.map((item) => (
              <Card key={`${item.routeType}-${item.effectiveFrom}`}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{item.routeType}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Action:</span> {item.actionType}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Decision:</span> {item.decision}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Actor:</span> {item.actor}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Effective:</span> {item.effectiveFrom}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Expires:</span> {item.expiresOn ?? "No expiry"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No approvals recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
