import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_GRADES, GRADE_THRESHOLDS } from "@/lib/constants";
import { absoluteUrl, buildGradePageHref, buildGradesHubHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CIDB grade guide",
  description: "Understand CIDB grade levels, threshold values, and where to find matching contractors.",
  alternates: {
    canonical: absoluteUrl(buildGradesHubHref()),
  },
};

export default function GradesHubPage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Grades", href: buildGradesHubHref() }]} />
      <section className="surface p-8">
        <h1 className="font-serif text-4xl font-semibold">CIDB grade guide</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Review every CIDB grade band and jump into detailed explanation pages with live location
          links from the database.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ALL_GRADES.map((grade) => (
          <Link href={buildGradePageHref(grade)} key={grade}>
            <Card className="h-full hover:border-primary">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">CIDB Grade {grade}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{GRADE_THRESHOLDS[grade]}</CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
