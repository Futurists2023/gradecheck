import Image from "next/image";
import Link from "next/link";

import {
  buildAboutHref,
  buildContactHref,
  buildDataUpdatesHref,
  buildMethodologyHref,
  buildVerifyGuideHref,
} from "@/lib/utils";

const platformLinks = [
  { href: buildAboutHref(), label: "About GradeCheck" },
  { href: buildMethodologyHref(), label: "Methodology" },
  { href: buildDataUpdatesHref(), label: "Data Updates" },
  { href: buildContactHref(), label: "Contact" },
];

const trustLinks = [{ href: buildVerifyGuideHref(), label: "How to Verify a CIDB Contractor" }];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-white/70 py-12">
      <div className="container-shell grid gap-8 text-sm text-muted-foreground lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="space-y-3">
          <div className="mb-6">
            <Link href="/" className="group flex items-center gap-3">
              <Image
                src="/logo-icon.png"
                alt="GradeCheck Logo"
                width={40}
                height={40}
                className="h-8 w-auto object-contain grayscale transition duration-300 group-hover:scale-105 group-hover:grayscale-0"
              />
              <span className="text-xl font-bold tracking-tight grayscale transition duration-300 group-hover:grayscale-0">
                <span className="text-slate-900 dark:text-slate-100">Grade</span>
                <span className="text-primary">Check</span>
              </span>
            </Link>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Trust and source context
          </p>
          <p>
            GradeCheck is an independent CIDB contractor verification and research platform for
            South Africa.
          </p>
          <p>
            Contractor records are sourced from the CIDB Register of Contractors and presented with
            verification links, registration status, grading history, and capture timestamps.
          </p>
          <p>
            GradeCheck is not affiliated with the Construction Industry Development Board. Final
            contractor confirmation should always be completed against the official CIDB source.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            About GradeCheck
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {platformLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Verify with confidence
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {trustLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
            <p className="pt-2 text-xs leading-6 text-muted-foreground">
              Use the methodology and data update pages to understand how GradeCheck interprets
              contractor records and when the local registry snapshot was last refreshed.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
