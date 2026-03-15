import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { StructuredData } from "@/components/StructuredData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexGradePage } from "@/lib/indexing";
import { ALL_GRADES, CLASS_CODE_LABELS, GRADE_THRESHOLDS } from "@/lib/constants";
import { getAvailableClassesForGrade, getGradeLocations } from "@/lib/queries";
import {
  absoluteUrl,
  buildCityHref,
  buildGradePageHref,
  buildGradesHubHref,
  parseGradePageSlug,
} from "@/lib/utils";

export const revalidate = 86400;

type GradeDetailPageProps = {
  params: {
    "grade-slug": string;
  };
};

export async function generateStaticParams() {
  return ALL_GRADES.map((grade) => ({
    "grade-slug": `cidb-grade-${grade}`,
  }));
}

export async function generateMetadata({ params }: GradeDetailPageProps): Promise<Metadata> {
  const grade = parseGradePageSlug(params["grade-slug"]);

  if (!grade) {
    return {};
  }

  const [classes, locations] = await Promise.all([
    getAvailableClassesForGrade(grade),
    getGradeLocations(grade),
  ]);
  const href = buildGradePageHref(grade);
  const isQualityQualified = shouldIndexGradePage({
    classCount: classes.length,
    locationCount: locations.length,
  });

  return {
    title: `What is a CIDB Grade ${grade} contractor?`,
    description: `Understand CIDB Grade ${grade} thresholds, classes, and live location pages for contractors at this grade.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function GradeDetailPage({ params }: GradeDetailPageProps) {
  const grade = parseGradePageSlug(params["grade-slug"]);
  if (!grade) {
    notFound();
  }

  const [classes, locations] = await Promise.all([
    getAvailableClassesForGrade(grade),
    getGradeLocations(grade),
  ]);

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is a CIDB Grade ${grade} contractor?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `A CIDB Grade ${grade} contractor may tender for projects valued at ${GRADE_THRESHOLDS[grade]}.`,
        },
      },
    ],
  };

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Grades", href: buildGradesHubHref() },
          { label: `CIDB Grade ${grade}`, href: buildGradePageHref(grade) },
        ]}
      />

      <section className="surface p-8">
        <h1 className="font-serif text-4xl font-semibold">What is a CIDB Grade {grade} contractor?</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          CIDB Grade {grade} contractors are registered to tender for projects valued at{" "}
          {GRADE_THRESHOLDS[grade]}. Use this guide to understand the threshold, see which work
          classes appear at this grade in the current dataset, and jump into location pages.
        </p>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Grade threshold table</h2>
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Tender value threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_GRADES.map((currentGrade) => (
                <TableRow
                  key={currentGrade}
                  className={currentGrade === grade ? "bg-secondary/60" : undefined}
                >
                  <TableCell>Grade {currentGrade}</TableCell>
                  <TableCell>{GRADE_THRESHOLDS[currentGrade]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-8">
          <h2 className="font-serif text-3xl font-semibold">Class codes at this grade</h2>
          <div className="mt-6 grid gap-3">
            {classes.map((classCode) => (
              <div key={classCode} className="rounded-3xl border border-border bg-white px-4 py-4">
                <p className="font-semibold">{classCode}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {CLASS_CODE_LABELS[classCode] ?? classCode}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-8">
          <h2 className="font-serif text-3xl font-semibold">Find Grade {grade} contractors near you</h2>
          <div className="mt-6 grid gap-3">
            {locations.map((location) => (
              <Link
                key={`${location.province}-${location.city}`}
                href={buildCityHref(location.province, location.city)}
                className="rounded-3xl border border-border bg-white px-4 py-4 hover:border-primary"
              >
                <p className="font-semibold">
                  {location.city}, {location.province}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {location.count} contractors at Grade {grade}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StructuredData id={`grade-${grade}-faq-jsonld`} data={faqData} />
    </div>
  );
}
