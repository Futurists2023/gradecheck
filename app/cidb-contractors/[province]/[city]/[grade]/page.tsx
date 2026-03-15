import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { GradeClassChooser } from "@/components/GradeClassChooser";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { buttonVariants } from "@/components/ui/button";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { CLASS_CODE_LABELS, GRADE_THRESHOLDS } from "@/lib/constants";
import {
  getAllCities,
  getCityBySlugs,
  getCityGradeBreakdown,
  getCityGradeClassPaths,
  getCityGradeEvidenceSummary,
  getContractorsByCity,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildCityGradeHref,
  buildCityHref,
  buildClassCodesHubHref,
  buildClassCodeHref,
  buildContractorsHubHref,
  buildGradePageHref,
  buildLeafHref,
  buildProvinceHref,
  buildVerifyHref,
  formatDateTime,
  parseGradeSlug,
} from "@/lib/utils";

export const revalidate = 86400;

type CityGradePageProps = {
  params: {
    province: string;
    city: string;
    grade: string;
  };
};

export async function generateStaticParams() {
  const cities = await getAllCities();
  const entries = await Promise.all(
    cities.map(async (city) => {
      const breakdown = await getCityGradeBreakdown(city.province, city.city);
      return breakdown.map((row) => ({
        province: buildProvinceHref(city.province).split("/").pop() ?? "",
        city: buildCityHref(city.province, city.city).split("/").pop() ?? "",
        grade: `grade-${row.grade_level}`,
      }));
    }),
  );

  return entries.flat();
}

export async function generateMetadata({ params }: CityGradePageProps): Promise<Metadata> {
  const cityRecord = await getCityBySlugs(params.province, params.city);
  const gradeLevel = parseGradeSlug(params.grade);

  if (!cityRecord || !gradeLevel) {
    return {};
  }

  return {
    title: `Grade ${gradeLevel} screening hub for ${cityRecord.city}, ${cityRecord.province}`,
    description: `Screen CIDB Grade ${gradeLevel} contractors in ${cityRecord.city}, ${cityRecord.province}, choose the right work class, and open verification-ready matches.`,
    alternates: {
      canonical: absoluteUrl(buildCityGradeHref(cityRecord.province, cityRecord.city, gradeLevel)),
    },
    robots: NOINDEX_FOLLOW_ROBOTS,
  };
}

export default async function CityGradePage({ params }: CityGradePageProps) {
  const cityRecord = await getCityBySlugs(params.province, params.city);
  const gradeLevel = parseGradeSlug(params.grade);

  if (!cityRecord || !gradeLevel) {
    notFound();
  }

  const [contractors, breakdown, classPaths, evidenceSummary] = await Promise.all([
    getContractorsByCity(cityRecord.province, cityRecord.city),
    getCityGradeBreakdown(cityRecord.province, cityRecord.city),
    getCityGradeClassPaths(cityRecord.province, cityRecord.city, gradeLevel),
    getCityGradeEvidenceSummary(cityRecord.province, cityRecord.city, gradeLevel),
  ]);

  const gradeRow = breakdown.find((row) => row.grade_level === gradeLevel);
  if (!gradeRow) {
    redirect(buildCityHref(cityRecord.province, cityRecord.city));
  }

  const filteredContractors = contractors.filter((contractor) =>
    contractor.gradings.some((grading) => grading.grade_level === gradeLevel),
  );
  const activeCount = filteredContractors.filter(
    (contractor) => contractor.registration_status === "Active",
  ).length;
  const adjacentGrades = breakdown
    .filter((row) => row.grade_level !== gradeLevel)
    .sort((left, right) => Math.abs(left.grade_level - gradeLevel) - Math.abs(right.grade_level - gradeLevel));

  const classChooserItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `CIDB Grade ${gradeLevel} class chooser for ${cityRecord.city}, ${cityRecord.province}`,
    itemListElement: classPaths.map((path, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${CLASS_CODE_LABELS[path.class_code] ?? path.class_code} (${path.class_code})`,
      url: absoluteUrl(
        path.has_public_leaf
          ? buildLeafHref(cityRecord.province, cityRecord.city, gradeLevel, path.class_code)
          : buildClassCodeHref(path.class_code),
      ),
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
        ]}
      />

      <section className="surface p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                City-grade screening hub
              </span>
              <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                Latest capture {formatDateTime(evidenceSummary.latest_capture)}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold">
              CIDB Grade {gradeLevel} contractors in {cityRecord.city}, {cityRecord.province}
            </h1>
            <p className="text-lg text-muted-foreground">
              Use this page when you already know the grade but still need to choose the right
              work class in {cityRecord.city}.
            </p>
            <p className="text-sm text-muted-foreground">
              Grade {gradeLevel} carries a CIDB tender threshold of {GRADE_THRESHOLDS[gradeLevel]}.
              Start with the class chooser below to open the most relevant class-specific shortlist.
            </p>
          </div>

          <div className="surface w-full max-w-md p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Quick actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="#class-chooser" className={buttonVariants({ variant: "default" })}>
                Jump to class chooser
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Contractors at this grade", filteredContractors.length],
            ["Active", activeCount],
            ["Classes available", classPaths.length],
            ["Latest capture", formatDateTime(evidenceSummary.latest_capture)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="class-chooser" className="surface p-8">
        <div className="max-w-3xl">
          <h2 className="font-serif text-3xl font-semibold">Choose the work class you need</h2>
          <p className="mt-3 text-muted-foreground">
            Start with the class that best matches the tender scope. Public shortlist pages are
            linked directly; lower-volume classes stay informational and point to the class guide.
          </p>
        </div>
        <div className="mt-6">
          <GradeClassChooser
            city={cityRecord.city}
            classPaths={classPaths}
            gradeLevel={gradeLevel}
            province={cityRecord.province}
          />
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Source confidence
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              CIDB-linked crawl evidence for this city-grade screening set.
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
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Broaden search
            </p>
            <div className="mt-4 grid gap-3">
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
              Change capability
            </p>
            <div className="mt-4 grid gap-3">
              {adjacentGrades.length > 0 ? (
                adjacentGrades.map((row) => (
                  <Link
                    key={row.grade_level}
                    href={buildCityGradeHref(cityRecord.province, cityRecord.city, row.grade_level)}
                    className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
                  >
                    Grade {row.grade_level} in {cityRecord.city}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No adjacent city-grade pages are available for this city.
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
                href={buildClassCodesHubHref()}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Browse CIDB class guides
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StructuredData
        id={`city-grade-${params.province}-${params.city}-${params.grade}`}
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `CIDB Grade ${gradeLevel} screening hub in ${cityRecord.city}, ${cityRecord.province}`,
          url: absoluteUrl(buildCityGradeHref(cityRecord.province, cityRecord.city, gradeLevel)),
        }}
      />
      <StructuredData
        id={`city-grade-classes-${params.province}-${params.city}-${params.grade}`}
        data={classChooserItemList}
      />
    </div>
  );
}
