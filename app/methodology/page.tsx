import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildMethodologyHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "GradeCheck methodology",
  description: "How GradeCheck normalizes CIDB contractor data into verification and research pages.",
  alternates: {
    canonical: absoluteUrl(buildMethodologyHref()),
  },
};

export default function MethodologyPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Methodology", href: buildMethodologyHref() }]} />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">Methodology</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            GradeCheck is built on a normalized PostgreSQL dataset of CIDB contractor records.
            Contractors are treated as the canonical entity layer, contractor gradings power class
            and grade intelligence, and crawl evidence preserves provenance.
          </p>
          <p>
            Public pages are only generated for route combinations with enough value to avoid thin
            or duplicate SEO surfaces.
          </p>
        </div>
      </section>
    </div>
  );
}
