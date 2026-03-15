import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { MonitoringTracker } from "@/components/MonitoringTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { absoluteUrl } from "@/lib/utils";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "GradeCheck | CIDB Contractor Verification Tool",
    template: "%s | GradeCheck",
  },
  description:
    "GradeCheck is a CIDB contractor verification tool for South Africa. Check CRS numbers, grades, classes, locations, and source-backed contractor records.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "LTAnbMgKi-69Md-cLG5SpsuQzMTeQoyaz4Gi0SyvNIU",
  },
  openGraph: {
    title: "GradeCheck | CIDB Contractor Verification Tool",
    description:
      "Use GradeCheck to verify CIDB contractors by name, CRS number, grade, class, and location.",
    url: absoluteUrl("/"),
    siteName: "GradeCheck",
    locale: "en_ZA",
    type: "website",
  },
};

const plausibleDomain =
  process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.replace(/^www\./, "")
    : "gradecheck.co.za";
const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans text-foreground">
        <MonitoringTracker />
        {ga4MeasurementId ? (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-google-tag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${ga4MeasurementId}');
              `}
            </Script>
          </>
        ) : null}
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1 py-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
