import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { CityGradeChooser } from "@/components/CityGradeChooser";
import { CityLeafChooser } from "@/components/CityLeafChooser";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { buttonVariants } from "@/components/ui/button";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexCityPage } from "@/lib/indexing";
import {
  getAllCities,
  getCityBySlugs,
  getCityGradeChooser,
  getContractorsByCity,
  getLeafPagesForCity,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildCityGradeHref,
  buildCityHref,
  buildContractorsHubHref,
  buildLeafHref,
  buildProvinceHref,
  buildVerifyHref,
  formatDateTime,
} from "@/lib/utils";

export const revalidate = 86400;

type CityPageProps = {
  params: {
    province: string;
    city: string;
  };
};

export async function generateStaticParams() {
  const cities = await getAllCities();
  return cities.map((city) => ({
    province: buildProvinceHref(city.province).split("/").pop() ?? "",
    city: buildCityHref(city.province, city.city).split("/").pop() ?? "",
  }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const cityRecord = await getCityBySlugs(params.province, params.city);

  if (!cityRecord) {
    return {};
  }

  const leafPages = await getLeafPagesForCity(cityRecord.province, cityRecord.city);
  const href = buildCityHref(cityRecord.province, cityRecord.city);
  const isQualityQualified = shouldIndexCityPage({
    contractorCount: cityRecord.count,
    leafPageCount: leafPages.length,
  });

  return {
    title: `${cityRecord.city} CIDB shortlist tool`,
    description: `Use this CIDB shortlist tool to open direct class-specific contractor shortlists in ${cityRecord.city}, ${cityRecord.province}, or fall back to broader grade routing when needed.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const cityRecord = await getCityBySlugs(params.province, params.city);
  if (!cityRecord) {
    notFound();
  }

  const [contractors, gradeChooser, leafPages] = await Promise.all([
    getContractorsByCity(cityRecord.province, cityRecord.city),
    getCityGradeChooser(cityRecord.province, cityRecord.city),
    getLeafPagesForCity(cityRecord.province, cityRecord.city),
  ]);

  const activeCount = contractors.filter(
    (contractor) => contractor.registration_status === "Active",
  ).length;
  const peCount = contractors.filter((contractor) => contractor.pe_flag).length;
  const latestCapture = contractors.reduce<string | null>(
    (latest, contractor) => {
      if (!latest) {
        return contractor.captured_at;
      }

      return new Date(contractor.captured_at) > new Date(latest)
        ? contractor.captured_at
        : latest;
    },
    null,
  );

  const strongestGrade = gradeChooser.reduce(
    (current, grade) =>
      !current || grade.public_leaf_count > current.public_leaf_count
        ? grade
        : current,
    gradeChooser[0] ?? null,
  );

  const gradeChooserItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cityRecord.city} CIDB grade routes`,
    itemListElement: gradeChooser.map((grade, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `Grade ${grade.grade_level}`,
      url: absoluteUrl(
        buildCityGradeHref(
          cityRecord.province,
          cityRecord.city,
          grade.grade_level,
        ),
      ),
    })),
  };

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Contractors", href: buildContractorsHubHref() },
          {
            label: cityRecord.province,
            href: buildProvinceHref(cityRecord.province),
          },
          {
            label: cityRecord.city,
            href: buildCityHref(cityRecord.province, cityRecord.city),
          },
        ]}
      />

      <section className="surface p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                City-grade routing hub
              </span>
              <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                Latest capture {formatDateTime(latestCapture)}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold">
              CIDB contractors in {cityRecord.city}, {cityRecord.province}
            </h1>
            <p className="text-lg text-muted-foreground">
              Use this page to open the right class-specific shortlist in{" "}
              {cityRecord.city} as quickly as possible.
            </p>
            <p className="text-sm text-muted-foreground">
              Start with a direct shortlist path below. Only drop into a broader
              grade page if you still need to decide between multiple work
              classes.
            </p>
          </div>

          <div className="surface w-full max-w-md p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Quick actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="#grade-chooser"
                className={buttonVariants({ variant: "default" })}
              >
                Jump to shortlist routes
              </Link>
              <Link
                href="#grade-fallback"
                className={buttonVariants({ variant: "outline" })}
              >
                Use grade fallback
              </Link>
              <Link
                href={buildProvinceHref(cityRecord.province)}
                className={buttonVariants({ variant: "outline" })}
              >
                Explore province
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
            ["Total contractors", contractors.length],
            ["Active", activeCount],
            ["Shortlist paths", leafPages.length],
            ["PE contractors", peCount],
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

      <section id="grade-chooser" className="surface p-8">
        <div className="max-w-3xl">
          <h2 className="font-serif text-3xl font-semibold">
            Go straight to the right class
          </h2>
          <p className="mt-3 text-muted-foreground">
            If you already know the work class you need, use one of these direct
            shortlist links.
          </p>
        </div>

        <div className="mt-6">
          <CityLeafChooser leafPages={leafPages} />
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Routing confidence
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              City-level coverage and freshness for this routing hub.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Public shortlist paths
              </p>
              <p className="mt-1 text-xl font-semibold">{leafPages.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Strongest grade
              </p>
              <p className="mt-1 text-xl font-semibold">
                {strongestGrade
                  ? `Grade ${strongestGrade.grade_level}`
                  : "Unavailable"}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Latest capture
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatDateTime(latestCapture)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="grade-fallback" className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">
          Need to see more grades instead?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Use the grade fallback only when you do not yet know which work class
          is the best match.
        </p>
        <div className="mt-6">
          <CityGradeChooser
            city={cityRecord.city}
            grades={gradeChooser}
            province={cityRecord.province}
          />
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
                href={buildProvinceHref(cityRecord.province)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Explore all of {cityRecord.province}
              </Link>
              <Link
                href={buildContractorsHubHref()}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Browse all CIDB contractor hubs
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Move into grades
            </p>
            <div className="mt-4 grid gap-3">
              {gradeChooser.slice(0, 3).map((grade) => (
                <Link
                  key={grade.grade_level}
                  href={buildCityGradeHref(
                    cityRecord.province,
                    cityRecord.city,
                    grade.grade_level,
                  )}
                  className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
                >
                  Open Grade {grade.grade_level} in {cityRecord.city}
                </Link>
              ))}
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
                href={buildCityHref(cityRecord.province, cityRecord.city)}
                className="rounded-2xl border border-border px-4 py-4 hover:border-primary"
              >
                Refresh this city routing hub
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StructuredData
        id={`city-${params.province}-${params.city}-jsonld`}
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${cityRecord.city} CIDB shortlist routes`,
          url: absoluteUrl(buildCityHref(cityRecord.province, cityRecord.city)),
        }}
      />
      <StructuredData
        id={`city-${params.province}-${params.city}-grades-itemlist`}
        data={gradeChooserItemList}
      />
    </div>
  );
}
