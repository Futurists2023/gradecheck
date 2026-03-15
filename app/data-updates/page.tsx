import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildDataUpdatesHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "GradeCheck data updates",
  description: "Freshness notes and update context for the current GradeCheck CIDB sample.",
  alternates: {
    canonical: absoluteUrl(buildDataUpdatesHref()),
  },
};

export default function DataUpdatesPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Data Updates", href: buildDataUpdatesHref() }]} />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">Data updates</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            This release uses the current local CIDB sample dataset loaded into PostgreSQL for
            product build and validation.
          </p>
          <p>
            Captured timestamps shown on contractor and leaf pages reflect the freshest available
            evidence stored in the database at render time.
          </p>
        </div>
      </section>
    </div>
  );
}
