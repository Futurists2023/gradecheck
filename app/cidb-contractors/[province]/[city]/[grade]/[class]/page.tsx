import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { LeafContractorExplorer } from "@/components/LeafContractorExplorer";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexLeafPage } from "@/lib/indexing";
import { CLASS_CODE_LABELS, GRADE_THRESHOLDS } from "@/lib/constants";
import {
  getAllLeafPages,
  getCityBySlugs,
  getContractorsByFilter,
  getLeafEvidenceSummary,
  getRelatedLeafPages,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildClassCodeHref,
  buildCityGradeHref,
  buildClassSlug,
  buildCityHref,
  buildContractorHref,
  buildContractorsHubHref,
  buildGradePageHref,
  buildLeafHref,
  buildProvinceHref,
  buildVerifyHref,
  formatDateTime,
  pluralize,
  parseClassSlug,
  parseGradeSlug,
} from "@/lib/utils";

export const revalidate = 86400;

type LeafPageProps = {
  params: {
    province: string;
    city: string;
    grade: string;
    class: string;
  };
};

export async function generateStaticParams() {
  const leafPages = await getAllLeafPages();
  return leafPages.map((page) => ({
    province: buildProvinceHref(page.province).split("/").pop() ?? "",
    city: buildCityHref(page.province, page.city).split("/").pop() ?? "",
    grade: `grade-${page.grade_level}`,
    class: buildClassSlug(page.class_code),
  }));
}

export async function generateMetadata({ params }: LeafPageProps): Promise<Metadata> {
  const cityRecord = await getCityBySlugs(params.province, params.city);
  const gradeLevel = parseGradeSlug(params.grade);
  const classCode = parseClassSlug(params.class);

  if (!cityRecord || !gradeLevel || !classCode) {
    return {};
  }

  const allLeafPages = await getAllLeafPages();
  const match = allLeafPages.find(
    (page) =>
      page.province === cityRecord.province &&
      page.city === cityRecord.city &&
      page.grade_level === gradeLevel &&
      page.class_code === classCode,
  );

  if (!match) {
    return {};
  }

  const classLabel = CLASS_CODE_LABELS[classCode] ?? classCode;
  const [contractors, evidenceSummary] = await Promise.all([
    getContractorsByFilter({
      province: cityRecord.province,
      city: cityRecord.city,
      grade_level: gradeLevel,
      class_code: classCode,
    }),
    getLeafEvidenceSummary(cityRecord.province, cityRecord.city, gradeLevel, classCode),
  ]);
  const activeCount = contractors.filter(
    (contractor) => contractor.registration_status === "Active",
  ).length;
  const href = buildLeafHref(cityRecord.province, cityRecord.city, gradeLevel, classCode);
  const isQualityQualified = shouldIndexLeafPage({
    contractorCount: match.count,
    activeCount,
    evidenceBackedContractors: evidenceSummary.contractors_with_evidence,
  });

  return {
    title: `Grade ${gradeLevel} ${classLabel} shortlist tool in ${cityRecord.city}, ${cityRecord.province}`,
    description: `Use this CIDB shortlist tool to review Grade ${gradeLevel} ${classLabel} contractors in ${cityRecord.city}, ${cityRecord.province}. ${match.count} registered contractors in the current verified sample.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function LeafPage({ params }: LeafPageProps) {
  const cityRecord = await getCityBySlugs(params.province, params.city);
  const gradeLevel = parseGradeSlug(params.grade);
  const classCode = parseClassSlug(params.class);

  if (!cityRecord || !gradeLevel || !classCode) {
    notFound();
  }

  if (params.class !== buildClassSlug(classCode)) {
    redirect(buildLeafHref(cityRecord.province, cityRecord.city, gradeLevel, classCode));
  }

  const [allLeafPages, contractors, relatedPages, evidenceSummary] = await Promise.all([
    getAllLeafPages(),
    getContractorsByFilter({
      province: cityRecord.province,
      city: cityRecord.city,
      grade_level: gradeLevel,
      class_code: classCode,
    }),
    getRelatedLeafPages(cityRecord.province, cityRecord.city, gradeLevel, classCode),
    getLeafEvidenceSummary(cityRecord.province, cityRecord.city, gradeLevel, classCode),
  ]);

  const match = allLeafPages.find(
    (page) =>
      page.province === cityRecord.province &&
      page.city === cityRecord.city &&
      page.grade_level === gradeLevel &&
      page.class_code === classCode,
  );

  if (!match) {
    redirect(buildCityGradeHref(cityRecord.province, cityRecord.city, gradeLevel));
  }

  const classLabel = CLASS_CODE_LABELS[classCode] ?? classCode;
  const activeCount = contractors.filter((contractor) => contractor.registration_status === "Active").length;
  const peCount = contractors.filter((contractor) => contractor.pe_flag).length;
  const nonActiveCount = contractors.length - activeCount;
  const expiringSoonCount = contractors.filter((contractor) => {
    if (contractor.registration_status !== "Active" || !contractor.expiry_date) {
      return false;
    }

    const expiry = new Date(contractor.expiry_date);
    const now = new Date();
    const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysToExpiry >= 0 && daysToExpiry <= 180;
  }).length;
  const broaderCoverageCount = contractors.filter((contractor) =>
    contractor.gradings.some(
      (grading) => !(grading.grade_level === gradeLevel && grading.class_code === classCode),
    ),
  ).length;
  const highestGradeHeld = contractors.reduce((highest, contractor) => {
    const contractorHighest = contractor.gradings.reduce(
      (contractorMax, grading) => Math.max(contractorMax, grading.grade_level),
      gradeLevel,
    );

    return Math.max(highest, contractorHighest);
  }, gradeLevel);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Grade ${gradeLevel} ${classLabel} contractors in ${cityRecord.city}, ${cityRecord.province}`,
    itemListElement: contractors.map((contractor, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(
        buildContractorHref(contractor.crs_number, contractor.contractor_name),
      ),
      name: contractor.contractor_name,
    })),
  };

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Contractors", href: buildContractorsHubHref() },
          { label: cityRecord.province, href: buildProvinceHref(cityRecord.province) },
          { label: cityRecord.city, href: buildCityHref(cityRecord.province, cityRecord.city) },
          {
            label: `Grade ${gradeLevel}`,
            href: buildCityGradeHref(cityRecord.province, cityRecord.city, gradeLevel),
          },
          {
            label: classLabel,
            href: buildLeafHref(cityRecord.province, cityRecord.city, gradeLevel, classCode),
          },
        ]}
      />

      <section className="surface p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                CIDB-backed intelligence page
              </span>
              <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                Last checked {formatDateTime(evidenceSummary.latest_capture)}
              </span>
              <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                {pluralize(evidenceSummary.source_urls, "source URL")}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold">
              Grade {gradeLevel} {classLabel} contractors in {cityRecord.city}, {cityRecord.province}
            </h1>
            <p className="text-lg text-muted-foreground">
              Use this page to shortlist contractors in {cityRecord.city} registered for Grade{" "}
              {gradeLevel} {classLabel.toLowerCase()} work. The current sample includes{" "}
              {pluralize(match.count, "matching contractor")}, with {pluralize(activeCount, "active registration")}
              {" "}and a CIDB tender threshold of {GRADE_THRESHOLDS[gradeLevel]}.
            </p>
            <p className="text-sm text-muted-foreground">
              Start with the contractor cards below, then open the strongest matches for full
              verification.
            </p>
          </div>

          <div className="surface w-full max-w-md p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Trust and action
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Evidence coverage
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {evidenceSummary.contractors_with_evidence} / {contractors.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  contractors linked to captured crawl evidence
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="#shortlist" className={buttonVariants({ variant: "default" })}>
                  Jump to shortlist
                </Link>
                <TrackingLink
                  href={buildVerifyHref()}
                  eventName="verify_open"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Open verify tool
                </TrackingLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="shortlist" className="space-y-4">
        <LeafContractorExplorer
          classCode={classCode}
          classLabel={classLabel}
          city={cityRecord.city}
          contractors={contractors}
          gradeLevel={gradeLevel}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Total contractors", contractors.length],
          ["Active", activeCount],
          ["Expired or suspended", nonActiveCount],
          ["PE contractors", peCount],
          ["Expiring soon", expiringSoonCount],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Page interpretation</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Tender threshold
            </p>
            <p className="mt-2 text-lg font-semibold">{GRADE_THRESHOLDS[gradeLevel]}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Grade {gradeLevel} is the relevant threshold for {classLabel.toLowerCase()} work.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Broader capability
            </p>
            <p className="mt-2 text-lg font-semibold">
              {pluralize(broaderCoverageCount, "contractor")} beyond this exact match
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Highest grade represented in this local result set: Grade {highestGradeHeld}.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Verification flow
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Review status and expiry here, then open the contractor profile and source CIDB page
              for final confirmation.
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Source confidence
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              CIDB-linked crawl evidence for this result set.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Evidence rows
              </p>
              <p className="mt-1 text-xl font-semibold">{evidenceSummary.evidence_rows}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                With evidence
              </p>
              <p className="mt-1 text-xl font-semibold">
                {evidenceSummary.contractors_with_evidence}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Latest capture
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatDateTime(evidenceSummary.latest_capture)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Next best actions</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Choose the next path based on what you need to do: broaden the shortlist, raise
          capability, switch work type, verify a contractor, or learn the CIDB context behind this
          page.
        </p>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Broaden this shortlist
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href={buildCityGradeHref(cityRecord.province, cityRecord.city, gradeLevel)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                View all Grade {gradeLevel} contractors in {cityRecord.city}
              </Link>
              <Link
                href={buildCityHref(cityRecord.province, cityRecord.city)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                View all contractors in {cityRecord.city}
              </Link>
              <Link
                href={buildProvinceHref(cityRecord.province)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Explore all of {cityRecord.province}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Increase capability
            </p>
            <div className="mt-4 grid gap-3">
              {relatedPages.sameClassDifferentGrade.length > 0 ? (
                relatedPages.sameClassDifferentGrade.map((page) => (
                  <Link
                    key={`${page.grade_level}-${page.class_code}`}
                    href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                    className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
                  >
                    Grade {page.grade_level} {CLASS_CODE_LABELS[page.class_code] ?? page.class_code} in{" "}
                    {page.city}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No higher-intent same-class grade pages currently meet the content threshold.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Switch work type
            </p>
            <div className="mt-4 grid gap-3">
              {relatedPages.sameGradeDifferentClass.length > 0 ? (
                relatedPages.sameGradeDifferentClass.map((page) => (
                  <Link
                    key={`${page.grade_level}-${page.class_code}`}
                    href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                    className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
                  >
                    Grade {page.grade_level} {CLASS_CODE_LABELS[page.class_code] ?? page.class_code} in{" "}
                    {page.city}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No other same-grade class pages currently qualify for this city.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Verify or learn
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href={buildVerifyHref()}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Open the CIDB verification tool
              </Link>
              <Link
                href={buildGradePageHref(gradeLevel)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Learn about CIDB Grade {gradeLevel}
              </Link>
              <Link
                href={buildClassCodeHref(classCode)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Learn about {classLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StructuredData id={`itemlist-${params.province}-${params.city}-${params.grade}-${params.class}`} data={itemList} />
    </div>
  );
}
