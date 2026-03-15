import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { absoluteUrl, buildAboutHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About GradeCheck",
  description:
    "Learn how GradeCheck structures CIDB contractor data for verification and discovery.",
  alternates: {
    canonical: absoluteUrl(buildAboutHref()),
  },
  robots: NOINDEX_FOLLOW_ROBOTS,
};

export default function AboutPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "About", href: buildAboutHref() }]} />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">About GradeCheck</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            GradeCheck is an independent contractor verification tool built on top of a normalized
            PostgreSQL seed of CIDB contractor records.
          </p>
          <p>
            The current dataset is a trustworthy development sample rather than a production-scale
            national crawl. It preserves real contractor identities, registration statuses, grade
            designations, and source links for auditability.
          </p>
          <p>
            Each contractor page is structured to support fast manual verification, location-based
            discovery, and future procurement intelligence workflows.
          </p>
        </div>
      </section>
    </div>
  );
}
