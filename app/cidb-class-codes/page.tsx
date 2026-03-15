import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLASS_CODE_LABELS, CLASS_CODE_SLUGS } from "@/lib/constants";
import { getClassSummaries } from "@/lib/queries";
import { absoluteUrl, buildClassCodeHref, buildClassCodesHubHref } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CIDB class codes",
  description: "Review CIDB work class codes and open class-specific contractor intelligence pages.",
  alternates: {
    canonical: absoluteUrl(buildClassCodesHubHref()),
  },
};

export default async function ClassCodesHubPage() {
  const classSummaries = await getClassSummaries();

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Class Codes", href: buildClassCodesHubHref() },
        ]}
      />
      <section className="surface p-8">
        <h1 className="font-serif text-4xl font-semibold">CIDB class codes</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          These pages explain each CIDB work class and connect it to the live GradeCheck contractor
          sample.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classSummaries.map((item) => (
          <Link href={buildClassCodeHref(item.class_code)} key={item.class_code}>
            <Card className="h-full hover:border-primary">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  {CLASS_CODE_LABELS[item.class_code] ?? item.class_code}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {item.class_code} - {item.contractor_count} contractors in sample
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
