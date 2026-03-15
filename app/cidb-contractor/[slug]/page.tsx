import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ExpiryCountdown } from "@/components/ExpiryCountdown";
import { GradeBadge } from "@/components/GradeBadge";
import { PEBadge } from "@/components/PEBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StructuredData } from "@/components/StructuredData";
import { TrackingLink } from "@/components/TrackingLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLaunchRobotsForHref } from "@/lib/index-budget";
import { shouldIndexContractorPage } from "@/lib/indexing";
import { getAllContractors, getContractorBySlug } from "@/lib/queries";
import {
  absoluteUrl,
  buildContractorHref,
  buildContractorSlug,
  buildCityHref,
  buildContractorsHubHref,
  buildProvinceHref,
  formatDateTime,
} from "@/lib/utils";

export const revalidate = 86400;

type ContractorProfilePageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  const contractors = await getAllContractors();
  return contractors.map((contractor) => ({
    slug: buildContractorSlug(contractor.crs_number, contractor.contractor_name),
  }));
}

export async function generateMetadata({ params }: ContractorProfilePageProps): Promise<Metadata> {
  const contractor = await getContractorBySlug(params.slug);

  if (!contractor) {
    return {};
  }

  const highestGrading = contractor.gradings[0];
  const href = buildContractorHref(contractor.crs_number, contractor.contractor_name);
  const isQualityQualified = shouldIndexContractorPage({
    gradingCount: contractor.gradings.length,
    hasSourceUrl: Boolean(contractor.source_url),
    hasCapturedAt: Boolean(contractor.captured_at),
  });

  return {
    title: `${contractor.contractor_name} - CIDB Grade ${highestGrading?.grade_level ?? "N/A"} ${highestGrading?.class_code ?? ""}`,
    description: `Use GradeCheck to check ${contractor.contractor_name} CIDB registration. CRS ${contractor.crs_number}. Status: ${contractor.registration_status}. Located in ${contractor.city}, ${contractor.province}.`,
    alternates: {
      canonical: absoluteUrl(href),
    },
    robots: await getLaunchRobotsForHref(href, isQualityQualified),
  };
}

export default async function ContractorProfilePage({ params }: ContractorProfilePageProps) {
  const contractor = await getContractorBySlug(params.slug);
  if (!contractor) {
    notFound();
  }

  const canonicalSlug = buildContractorSlug(contractor.crs_number, contractor.contractor_name);
  if (params.slug !== canonicalSlug) {
    redirect(buildContractorHref(contractor.crs_number, contractor.contractor_name));
  }

  const highestGrading = contractor.gradings[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: contractor.contractor_name,
    identifier: contractor.crs_number,
    address: {
      "@type": "PostalAddress",
      addressLocality: contractor.city,
      addressRegion: contractor.province,
      addressCountry: "ZA",
    },
    description: `CIDB registered contractor. Grade ${highestGrading?.grade_level ?? "N/A"} ${highestGrading?.class_code ?? ""}. Status: ${contractor.registration_status}.`,
    url: absoluteUrl(buildContractorHref(contractor.crs_number, contractor.contractor_name)),
  };

  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Contractors", href: buildContractorsHubHref() },
          { label: contractor.province, href: buildProvinceHref(contractor.province) },
          { label: contractor.city, href: buildCityHref(contractor.province, contractor.city) },
          {
            label: contractor.contractor_name,
            href: buildContractorHref(contractor.crs_number, contractor.contractor_name),
          },
        ]}
      />

      <section className="surface p-8 md:p-12">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={contractor.registration_status} />
          <PEBadge pe_flag={contractor.pe_flag} />
        </div>
        <h1 className="mt-5 font-serif text-4xl font-semibold">{contractor.contractor_name}</h1>
        {contractor.trading_name ? (
          <p className="mt-2 text-lg text-muted-foreground">Trading as {contractor.trading_name}</p>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CRS Number</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{contractor.crs_number}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {contractor.city}, {contractor.province}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expiry</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpiryCountdown
                expiry_date={contractor.expiry_date}
                status={contractor.registration_status}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Contractor grades</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contractor.gradings.map((grading) => (
            <GradeBadge
              key={grading.id}
              grade_level={grading.grade_level}
              class_code={grading.class_code}
            />
          ))}
        </div>
      </section>

      <section className="surface p-8">
        <h2 className="font-serif text-3xl font-semibold">Verification</h2>
        <div className="mt-4 space-y-3 text-muted-foreground">
          <p>Data sourced from the CIDB Register of Contractors.</p>
          <p>Captured: {formatDateTime(contractor.captured_at)}</p>
          <TrackingLink
            href={contractor.source_url}
            trackingHref={buildContractorHref(contractor.crs_number, contractor.contractor_name)}
            eventName="source_click"
            target="_blank"
            rel="noreferrer"
            className="inline-flex font-semibold text-primary hover:underline"
          >
            Verify on CIDB portal {"->"}
          </TrackingLink>
        </div>
      </section>

      <StructuredData id={`contractor-${contractor.crs_number}-jsonld`} data={jsonLd} />
    </div>
  );
}
