import { clsx, type ClassValue } from "clsx";
import { differenceInMonths, format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { CLASS_CODE_SLUGS, PROVINCE_SLUGS } from "@/lib/constants";

const LEGAL_SUFFIX_PATTERN =
  /\b(?:pty(?:\s*ltd)?|ltd|cc)\b/gi;

const REVERSE_PROVINCE_SLUGS = Object.fromEntries(
  Object.entries(PROVINCE_SLUGS).map(([province, slug]) => [slug, province]),
) as Record<string, string>;

const REVERSE_CLASS_CODE_SLUGS = Object.fromEntries(
  Object.entries(CLASS_CODE_SLUGS).map(([code, slug]) => [slug, code]),
) as Record<string, string>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeContractorNameForSlug(contractorName: string): string {
  return contractorName
    .replace(/[()]/g, " ")
    .replace(LEGAL_SUFFIX_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildContractorSlug(crsNumber: string, contractorName: string): string {
  return `${crsNumber}-${slugify(normalizeContractorNameForSlug(contractorName))}`;
}

export function buildProvinceSlug(province: string): string {
  return PROVINCE_SLUGS[province] ?? slugify(province);
}

export function parseProvinceSlug(provinceSlug: string): string | null {
  return REVERSE_PROVINCE_SLUGS[provinceSlug] ?? null;
}

export function buildCitySlug(city: string): string {
  return slugify(city);
}

export function buildGradeSlug(grade: number): string {
  return `grade-${grade}`;
}

export function buildClassSlug(classCode: string): string {
  return CLASS_CODE_SLUGS[classCode] ?? slugify(classCode);
}

export function buildGradePageSlug(grade: number): string {
  return `cidb-grade-${grade}`;
}

export function buildContractorsHubHref(): string {
  return "/cidb-contractors";
}

export function buildContractorHref(crsNumber: string, contractorName: string): string {
  return `/cidb-contractor/${buildContractorSlug(crsNumber, contractorName)}`;
}

export function buildProvinceHref(province: string): string {
  return `${buildContractorsHubHref()}/${buildProvinceSlug(province)}`;
}

export function buildCityHref(province: string, city: string): string {
  return `${buildProvinceHref(province)}/${buildCitySlug(city)}`;
}

export function buildCityGradeHref(province: string, city: string, grade: number): string {
  return `${buildCityHref(province, city)}/${buildGradeSlug(grade)}`;
}

export function buildLeafHref(
  province: string,
  city: string,
  grade: number,
  classCode: string,
): string {
  return `${buildCityGradeHref(province, city, grade)}/${buildClassSlug(classCode)}`;
}

export function buildVerifyHref(): string {
  return "/verify-cidb-contractor";
}

export function buildGradesHubHref(): string {
  return "/cidb-grades";
}

export function buildGradePageHref(grade: number): string {
  return `${buildGradesHubHref()}/${buildGradePageSlug(grade)}`;
}

export function buildClassCodesHubHref(): string {
  return "/cidb-class-codes";
}

export function buildClassCodeHref(classCode: string): string {
  return `${buildClassCodesHubHref()}/${buildClassSlug(classCode)}`;
}

export function buildGradeTableHref(): string {
  return "/cidb-grade-table";
}

export function buildAboutHref(): string {
  return "/about-gradecheck";
}

export function buildMethodologyHref(): string {
  return "/methodology";
}

export function buildDataUpdatesHref(): string {
  return "/data-updates";
}

export function buildContactHref(): string {
  return "/contact";
}

export function buildVerifyGuideHref(): string {
  return "/how-to-verify-a-cidb-contractor";
}

export function buildStatusExplainerHref(): string {
  return "/cidb-registration-status-explained";
}

export function buildPEExplainerHref(): string {
  return "/what-is-a-pe-contractor";
}

export function parseGradeSlug(gradeSlug: string): number | null {
  const match = /^grade-(\d)$/.exec(gradeSlug);
  return match ? Number(match[1]) : null;
}

export function parseGradePageSlug(gradeSlug: string): number | null {
  const match = /^cidb-grade-(\d)$/.exec(gradeSlug);
  return match ? Number(match[1]) : null;
}

export function parseClassSlug(classSlug: string): string | null {
  const directMatch = REVERSE_CLASS_CODE_SLUGS[classSlug];
  if (directMatch) {
    return directMatch;
  }

  const uppercase = classSlug.toUpperCase();
  return CLASS_CODE_SLUGS[uppercase] ? uppercase : null;
}

export function absoluteUrl(path = "/"): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, siteUrl).toString();
}

export function formatDate(date: string | null | undefined): string {
  if (!date) {
    return "Unavailable";
  }

  return format(new Date(date), "d MMMM yyyy");
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) {
    return "Unavailable";
  }

  return format(new Date(date), "d MMM yyyy 'at' HH:mm");
}

export function formatExpiryLabel(expiryDate: string | null, status: string): string {
  if (!expiryDate) {
    return "Expiry date unavailable";
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const months = Math.abs(differenceInMonths(expiry, now));

  if (status === "Suspended") {
    return `Suspended - Expiry: ${formatDate(expiryDate)}`;
  }

  if (status === "DeRegistered") {
    return `DeRegistered - Last known expiry: ${formatDate(expiryDate)}`;
  }

  if (status === "Expired" || expiry < now) {
    return `Expired ${months >= 12 ? `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? "" : "s"}` : `${months} month${months === 1 ? "" : "s"}`} ago`;
  }

  return `Expires in ${months} month${months === 1 ? "" : "s"}`;
}

export function titleCaseWords(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatCompactDate(date: string | null | undefined): string {
  if (!date) {
    return "Unavailable";
  }

  return format(new Date(date), "MMM yyyy");
}

export function sortStatuses(status: string): number {
  if (status === "Active") {
    return 0;
  }

  if (status === "Suspended") {
    return 1;
  }

  if (status === "DeRegistered") {
    return 2;
  }

  return 3;
}
