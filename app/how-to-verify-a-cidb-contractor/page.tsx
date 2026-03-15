import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildVerifyGuideHref, buildVerifyHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How to verify a CIDB contractor",
  description: "Follow a practical workflow for checking CIDB status, grade, class, expiry, and source evidence.",
  alternates: {
    canonical: absoluteUrl(buildVerifyGuideHref()),
  },
};

export default function VerifyGuidePage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "How to Verify a CIDB Contractor", href: buildVerifyGuideHref() },
        ]}
      />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">How to verify a CIDB contractor</h1>
        <div className="mt-6 space-y-5 text-muted-foreground">
          <p>
            Start with a CRS number or contractor name. Search GradeCheck to find the closest
            match, then confirm the contractor&apos;s registration status, expiry date, and full
            grading history before shortlisting.
          </p>
          <p>
            The final verification step is always the source CIDB page. Every contractor profile on
            GradeCheck links back to the captured source record so you can validate the result at
            the point of decision.
          </p>
          <p>
            Use the live verification workflow at{" "}
            <Link href={buildVerifyHref()} className="font-semibold text-primary hover:underline">
              {buildVerifyHref()}
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
