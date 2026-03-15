import type { Metadata } from "next";
import Link from "next/link";

import { HomeSearch } from "@/components/HomeSearch";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_GRADES, CLASS_CODE_LABELS, GRADE_THRESHOLDS } from "@/lib/constants";
import { getAllCities, getAllLeafPages, getClassSummaries, getAllProvinces, getStats } from "@/lib/queries";
import {
  absoluteUrl,
  buildClassCodeHref,
  buildCityHref,
  buildGradePageHref,
  buildGradesHubHref,
  buildGradeTableHref,
  buildLeafHref,
  buildProvinceHref,
  buildVerifyHref,
  formatDate,
  pluralize,
} from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CIDB contractor verification tool for South Africa",
  description:
    "Use GradeCheck as a CIDB contractor verification tool. Search by contractor name, CRS number, grade, class, and location across South Africa.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

export default async function HomePage() {
  const [stats, provinces, cities, leafPages, classSummaries] = await Promise.all([
    getStats(),
    getAllProvinces(),
    getAllCities(),
    getAllLeafPages(),
    getClassSummaries(),
  ]);

  const featuredCities = cities.slice(0, 4);
  const featuredLeafPages = leafPages
    .slice()
    .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city))
    .slice(0, 4);
  const featuredClasses = classSummaries.slice(0, 6);
  const featuredGrades = ALL_GRADES.slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GradeCheck",
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(buildVerifyHref())}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="container-shell space-y-8">
      <section className="surface overflow-hidden p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              South Africa verification tool
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              Verify the right CIDB contractor faster
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Search by contractor name or CRS number, then move straight into the right province,
              city, grade, or shortlist page without fighting the official portal.
            </p>
            <div className="mt-8 max-w-2xl">
              <HomeSearch />
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[1.75rem] border border-primary/15 bg-[linear-gradient(160deg,rgba(7,124,141,0.08),rgba(255,255,255,0.96))] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Registry snapshot
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Contractors
                  </p>
                  <p className="mt-1 text-3xl font-semibold">{stats.total}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Active
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-emerald-700">{stats.active}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Provinces
                  </p>
                  <p className="mt-1 text-3xl font-semibold">{stats.provinces}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Updated
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatDate(stats.latest_capture)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-white/80 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Quick start
              </p>
              <div className="mt-4 space-y-3">
                <TrackingLink
                  href={buildVerifyHref()}
                  eventName="verify_open"
                  className="block rounded-2xl border border-border bg-white px-4 py-3 font-semibold hover:border-primary"
                >
                  Verify a specific contractor
                </TrackingLink>
                <Link
                  href={buildProvinceHref(provinces[0])}
                  className="block rounded-2xl border border-border bg-white px-4 py-3 font-semibold hover:border-primary"
                >
                  Browse live province hubs
                </Link>
                <Link
                  href={buildGradeTableHref()}
                  className="block rounded-2xl border border-border bg-white px-4 py-3 font-semibold hover:border-primary"
                >
                  Check CIDB grade thresholds
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface p-7">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Start local</p>
          <h2 className="mt-3 font-serif text-2xl font-semibold">Province and city hubs</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a regional hub first when you know the location but still need the right shortlist.
          </p>
          <div className="mt-5 grid gap-3">
            {provinces.map((province) => (
              <Link
                href={buildProvinceHref(province)}
                key={province}
                className="rounded-2xl border border-border bg-white px-4 py-3 font-semibold hover:border-primary"
              >
                {province}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {featuredCities.map((city) => (
              <Link
                key={`${city.province}-${city.city}`}
                href={buildCityHref(city.province, city.city)}
                className="rounded-full border border-border bg-white px-3 py-2 text-sm hover:border-primary"
              >
                {city.city}
              </Link>
            ))}
          </div>
        </div>

        <div className="surface p-7">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Go direct
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold">High-intent shortlist pages</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These are the fastest routes when you already know the work class and location.
          </p>
          <div className="mt-5 grid gap-3">
            {featuredLeafPages.map((page) => (
              <TrackingLink
                key={`${page.province}-${page.city}-${page.grade_level}-${page.class_code}`}
                href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                eventName="leaf_click"
                className="rounded-2xl border border-border bg-white px-4 py-4 hover:border-primary"
              >
                <p className="font-semibold">
                  {CLASS_CODE_LABELS[page.class_code] ?? page.class_code} in {page.city}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grade {page.grade_level} - {page.count} contractors
                </p>
              </TrackingLink>
            ))}
          </div>
        </div>

        <div className="surface p-7">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Understand grades
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold">Thresholds and capability</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use grade explainers when you need context before narrowing to a city or class.
          </p>
          <div className="mt-5 grid gap-3">
            {featuredGrades.map((grade) => (
              <Link
                href={buildGradePageHref(grade)}
                key={grade}
                className="rounded-2xl border border-border bg-white px-4 py-4 hover:border-primary"
              >
                <p className="font-semibold">CIDB Grade {grade}</p>
                <p className="mt-1 text-sm text-muted-foreground">{GRADE_THRESHOLDS[grade]}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={buildGradesHubHref()} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open all grades
            </Link>
            <Link href={buildGradeTableHref()} className={buttonVariants({ variant: "outline", size: "sm" })}>
              View grade table
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Search", "Find contractors by CRS number, business name, city, or grade."],
          ["Verify", "Review status, expiry dates, and every grading held by the contractor."],
          ["Confirm", "Jump through to the CIDB source page for final verification and audit."],
        ].map(([title, body], index) => (
          <Card key={title}>
            <CardHeader>
              <p className="text-sm uppercase tracking-[0.2em] text-primary">Step {index + 1}</p>
              <CardTitle className="font-serif text-2xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="surface p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold">Current registry footprint</h2>
            <p className="mt-3 text-muted-foreground">
              GradeCheck currently indexes {pluralize(stats.total, "contractor")} across{" "}
              {pluralize(stats.cities, "city")} in {pluralize(stats.provinces, "province")}. Use
              class hubs when you know the type of work and want a faster route into the right
              shortlist.
            </p>
          </div>
          <TrackingLink
            href={buildVerifyHref()}
            eventName="verify_open"
            className={buttonVariants({ size: "sm" })}
          >
            Open verify tool
          </TrackingLink>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {featuredClasses.map((item) => (
            <Link
              key={item.class_code}
              href={buildClassCodeHref(item.class_code)}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm hover:border-primary"
            >
              <span className="font-semibold">{item.class_code}</span>{" "}
              <span className="text-muted-foreground">
                {CLASS_CODE_LABELS[item.class_code] ?? item.class_code} ({item.contractor_count})
              </span>
            </Link>
          ))}
        </div>
      </section>

      <StructuredData id="home-jsonld" data={jsonLd} />
    </div>
  );
}
