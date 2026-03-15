import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildStatusExplainerHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CIDB registration status explained",
  description: "Understand what active, suspended, and expired CIDB contractor statuses mean for verification and procurement screening.",
  alternates: {
    canonical: absoluteUrl(buildStatusExplainerHref()),
  },
};

export default function RegistrationStatusExplainerPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Registration Status Explained", href: buildStatusExplainerHref() },
        ]}
      />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">CIDB registration status explained</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            An active registration generally means the contractor is currently listed as valid in
            the source registry. Suspended and expired statuses need extra care because they can
            affect shortlist eligibility and procurement compliance.
          </p>
          <p>
            GradeCheck keeps these statuses visible on search results, intelligence pages, and
            contractor profiles so screening teams can separate viable contractors from higher-risk
            records quickly.
          </p>
        </div>
      </section>
    </div>
  );
}
