import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildPEExplainerHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What is a PE contractor",
  description: "Understand the Potentially Emerging Enterprise flag and how to use it in CIDB contractor screening.",
  alternates: {
    canonical: absoluteUrl(buildPEExplainerHref()),
  },
};

export default function PEContractorExplainerPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "What Is a PE Contractor", href: buildPEExplainerHref() },
        ]}
      />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">What is a PE contractor?</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            On GradeCheck, the PE badge indicates a Potentially Emerging Enterprise flag from the
            underlying contractor record. It is shown as a screening signal, not as a standalone
            quality judgment.
          </p>
          <p>
            Procurement teams can use the PE flag alongside registration status, expiry timing,
            province, city, and grade coverage to make more context-aware shortlist decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
