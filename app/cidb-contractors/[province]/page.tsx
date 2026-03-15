import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ProvinceCityChooser } from "@/components/ProvinceCityChooser";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { buttonVariants } from "@/components/ui/button";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexProvincePage } from "@/lib/indexing";
import {
  getAllCities,
  getAllProvinces,
  getContractorsByProvince,
  getLeafPagesForProvince,
  getProvinceBySlug,
  getProvinceStats,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildCityHref,
  buildContractorsHubHref,
  buildLeafHref,
  buildProvinceHref,
  buildVerifyHref,
  formatDateTime,
} from "@/lib/utils";

export const revalidate = 86400;

type ProvincePageProps = {
  params: {
    province: string;
  };
};

export async function generateStaticParams() {
  const provinces = await getAllProvinces();
  return provinces.map((province) => ({
    province: buildProvinceHref(province).split("/").pop() ?? "",
  }));
}

export async function generateMetadata({ params }: ProvincePageProps): Promise<Metadata> {
  const province = await getProvinceBySlug(params.province);

  if (!province) {
    return {};
  }

  const [stats, leafPages] = await Promise.all([
    getProvinceStats(province),
    getLeafPagesForProvince(province),
  ]);

  const href = buildProvinceHref(province);
  const isQualityQualified = shouldIndexProvincePage({
    contractorCount: stats?.total ?? 0,
    leafPageCount: leafPages.length,
  });

  return {
    title: `${province} CIDB browse tool`,
    description: `Use this regional CIDB browse tool to move from ${province} into the right city hub and class-specific shortlist routes.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function ProvincePage({ params }: ProvincePageProps) {
  const province = await getProvinceBySlug(params.province);
  if (!province) {
    notFound();
  }

  const [stats, contractors, cities, leafPages] = await Promise.all([
    getProvinceStats(province),
    getContractorsByProvince(province),
    getAllCities(),
    getLeafPagesForProvince(province),
  ]);

  if (!stats) {
    notFound();
  }

  const provinceCities = cities.filter((item) => item.province === province);
  const latestCapture = contractors.reduce<string | null>((latest, contractor) => {
    if (!latest) {
      return contractor.captured_at;
    }

    return new Date(contractor.captured_at) > new Date(latest) ? contractor.captured_at : latest;
  }, null);

  const sortedLeafPages = [...leafPages].sort(
    (left, right) => right.count - left.count || left.city.localeCompare(right.city) || left.grade_level - right.grade_level,
  );

  const cityItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${province} city hubs`,
    itemListElement: provinceCities.map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: city.city,
      url: absoluteUrl(buildCityHref(province, city.city)),
    })),
  };

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Contractors", href: buildContractorsHubHref() },
          { label: province, href: buildProvinceHref(province) },
        ]}
      />

      <section className="surface p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                Province browse hub
              </span>
              <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                Latest capture {formatDateTime(latestCapture)}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold">{province} CIDB contractors</h1>
            <p className="text-lg text-muted-foreground">
              Use this province page to browse cities and discover the strongest shortlist routes
              across {province}.
            </p>
            <p className="text-sm text-muted-foreground">
              This is a regional discovery layer, not a province-wide screening tool. Start with a
              city when you need stronger intent and faster shortlist paths.
            </p>
          </div>

          <div className="surface w-full max-w-md p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Quick actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="#city-chooser" className={buttonVariants({ variant: "default" })}>
                Jump to cities
              </Link>
              <Link href="#shortlist-paths" className={buttonVariants({ variant: "outline" })}>
                Popular shortlist paths
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
            ["Total contractors", stats.total],
            ["Active", stats.active],
            ["Cities", stats.cities],
            ["Shortlist paths", leafPages.length],
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

      <section id="city-chooser" className="surface p-8">
        <div className="max-w-3xl">
          <h2 className="font-serif text-3xl font-semibold">Choose a city to continue</h2>
          <p className="mt-3 text-muted-foreground">
            City pages carry the stronger intent. Open a city hub when you want direct shortlist
            links or grade-level routing.
          </p>
        </div>
        <div className="mt-6">
          <ProvinceCityChooser cities={provinceCities} province={province} />
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Browse confidence
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Regional coverage and freshness for this province browse layer.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Cities covered
              </p>
              <p className="mt-1 text-xl font-semibold">{provinceCities.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Shortlist paths
              </p>
              <p className="mt-1 text-xl font-semibold">{leafPages.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Latest capture
              </p>
              <p className="mt-1 text-sm font-medium">{formatDateTime(latestCapture)}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="shortlist-paths" className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Popular shortlist paths in {province}</h2>
        <p className="mt-3 text-muted-foreground">
          These are the strongest city-grade-class routes currently available in this province.
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {sortedLeafPages.length > 0 ? (
            sortedLeafPages.map((page) => (
              <Link
                key={`${page.city}-${page.grade_level}-${page.class_code}`}
                href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                className="rounded-[1.6rem] border border-border bg-white px-4 py-4 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                        {page.city}
                      </span>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Grade {page.grade_level}
                      </span>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {page.class_code}
                      </span>
                    </div>
                    <p className="font-serif text-xl font-semibold">
                      Open {page.city} Grade {page.grade_level} {page.class_code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {page.count} contractors currently qualify for this shortlist path.
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground">
              No shortlist paths currently meet the five-contractor threshold for this province.
            </p>
          )}
        </div>
      </section>

      <StructuredData
        id={`province-${params.province}-jsonld`}
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${province} CIDB browse hub`,
          url: absoluteUrl(buildProvinceHref(province)),
        }}
      />
      <StructuredData id={`province-${params.province}-cities-itemlist`} data={cityItemList} />
    </div>
  );
}
