import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { absoluteUrl, buildContactHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact GradeCheck",
  description: "Contact GradeCheck about CIDB contractor verification and research workflows.",
  alternates: {
    canonical: absoluteUrl(buildContactHref()),
  },
};

export default function ContactPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Contact", href: buildContactHref() }]} />
      <section className="surface p-8 md:p-12">
        <h1 className="font-serif text-4xl font-semibold">Contact</h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          GradeCheck is currently in MVP mode. This placeholder contact page reserves the
          canonical slug for future launch-ready support and sales workflows.
        </p>
      </section>
    </div>
  );
}
