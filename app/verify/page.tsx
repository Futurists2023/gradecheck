import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { VerifySearch } from "@/components/VerifySearch";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { absoluteUrl, buildVerifyHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verify a CIDB contractor",
  description:
    "Search by contractor name or CRS number, then compare source links and captured timestamps.",
  alternates: {
    canonical: absoluteUrl(buildVerifyHref()),
  },
  robots: NOINDEX_FOLLOW_ROBOTS,
};

export default function VerifyPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Verify", href: buildVerifyHref() }]} />
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Free verification tool</p>
        <h1 className="font-serif text-4xl font-semibold">Verify a CIDB contractor</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Search by CRS number or contractor name. Results are pulled from the live PostgreSQL
          registry in this environment, with direct links back to the source CIDB profile and
          captured timing for fast validation.
        </p>
      </section>
      <VerifySearch />
    </div>
  );
}
