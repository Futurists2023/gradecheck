import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { StructuredData } from "@/components/StructuredData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLASS_CODE_LABELS, CLASS_CODE_SLUGS } from "@/lib/constants";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexClassCodePage } from "@/lib/indexing";
import { getAllLeafPages, getClassSummaries } from "@/lib/queries";
import { absoluteUrl, buildClassCodeHref, buildClassCodesHubHref, buildLeafHref, parseClassSlug } from "@/lib/utils";

export const revalidate = 86400;

type ClassCodePageProps = {
  params: {
    "class-slug": string;
  };
};

export async function generateStaticParams() {
  return Object.values(CLASS_CODE_SLUGS).map((classSlug) => ({
    "class-slug": classSlug,
  }));
}

export async function generateMetadata({ params }: ClassCodePageProps): Promise<Metadata> {
  const classCode = parseClassSlug(params["class-slug"]);
  if (!classCode) {
    return {};
  }

  const [leafPages, classSummaries] = await Promise.all([getAllLeafPages(), getClassSummaries()]);
  const classLeafPages = leafPages.filter((page) => page.class_code === classCode);
  const classSummary = classSummaries.find((item) => item.class_code === classCode);
  const href = buildClassCodeHref(classCode);
  const isQualityQualified = shouldIndexClassCodePage({
    contractorCount: classSummary?.contractor_count ?? 0,
    leafPageCount: classLeafPages.length,
  });

  return {
    title: `${CLASS_CODE_LABELS[classCode]} CIDB class code`,
    description: `Understand the ${classCode} CIDB class code and explore matching grade-and-location pages.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function ClassCodePage({ params }: ClassCodePageProps) {
  const classCode = parseClassSlug(params["class-slug"]);
  if (!classCode) {
    notFound();
  }

  const canonicalClassSlug = CLASS_CODE_SLUGS[classCode];
  if (params["class-slug"] !== canonicalClassSlug) {
    redirect(buildClassCodeHref(classCode));
  }

  const [leafPages, classSummaries] = await Promise.all([getAllLeafPages(), getClassSummaries()]);
  const classLeafPages = leafPages.filter((page) => page.class_code === classCode);
  const classSummary = classSummaries.find((item) => item.class_code === classCode);

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Class Codes", href: buildClassCodesHubHref() },
          { label: CLASS_CODE_LABELS[classCode] ?? classCode, href: buildClassCodeHref(classCode) },
        ]}
      />
      <section className="surface p-8">
        <h1 className="font-serif text-4xl font-semibold">{CLASS_CODE_LABELS[classCode]} ({classCode})</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          This class page explains the {classCode} CIDB designation and links to the strongest
          city-and-grade pages in the current dataset for procurement research and verification.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Canonical class slug</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{canonicalClassSlug}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contractors in sample</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {classSummary?.contractor_count ?? 0}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Related intelligence pages</h2>
        <div className="mt-6 grid gap-3">
          {classLeafPages.length > 0 ? (
            classLeafPages.map((page) => (
              <Link
                key={`${page.province}-${page.city}-${page.grade_level}`}
                href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                className="rounded-3xl border border-border bg-white px-4 py-4 hover:border-primary"
              >
                <p className="font-semibold">
                  {page.city}, {page.province}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grade {page.grade_level} - {page.count} contractors
                </p>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground">
              No grade-and-location leaf pages currently meet the indexing threshold for this class.
            </p>
          )}
        </div>
      </section>

      <StructuredData
        id={`class-code-${classCode}`}
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: `${CLASS_CODE_LABELS[classCode]} (${classCode})`,
          termCode: classCode,
          url: absoluteUrl(buildClassCodeHref(classCode)),
        }}
      />
    </div>
  );
}
