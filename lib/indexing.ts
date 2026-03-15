import type { Metadata } from "next";
import { SEO_QUALITY_THRESHOLDS } from "@/lib/constants";

export const INDEX_FOLLOW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
};

export const NOINDEX_FOLLOW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

export function getRobotsForQuality(isIndexable: boolean): NonNullable<Metadata["robots"]> {
  return isIndexable ? INDEX_FOLLOW_ROBOTS : NOINDEX_FOLLOW_ROBOTS;
}

export function shouldIndexProvincePage(input: {
  contractorCount: number;
  leafPageCount: number;
}): boolean {
  return (
    input.contractorCount >= SEO_QUALITY_THRESHOLDS.provinceMinContractors &&
    input.leafPageCount >= SEO_QUALITY_THRESHOLDS.provinceMinLeafPages
  );
}

export function shouldIndexCityPage(input: {
  contractorCount: number;
  leafPageCount: number;
}): boolean {
  return (
    input.contractorCount >= SEO_QUALITY_THRESHOLDS.cityMinContractors &&
    input.leafPageCount >= SEO_QUALITY_THRESHOLDS.cityMinLeafPages
  );
}

export function shouldIndexLeafPage(input: {
  contractorCount: number;
  activeCount: number;
  evidenceBackedContractors: number;
}): boolean {
  return (
    input.contractorCount >= SEO_QUALITY_THRESHOLDS.leafMinContractors &&
    input.activeCount >= SEO_QUALITY_THRESHOLDS.leafMinActiveContractors &&
    input.evidenceBackedContractors >= SEO_QUALITY_THRESHOLDS.leafMinEvidenceBackedContractors
  );
}

export function shouldIndexContractorPage(input: {
  gradingCount: number;
  hasSourceUrl: boolean;
  hasCapturedAt: boolean;
}): boolean {
  return (
    input.gradingCount >= SEO_QUALITY_THRESHOLDS.contractorMinGradings &&
    input.hasSourceUrl &&
    input.hasCapturedAt
  );
}

export function shouldIndexGradePage(input: {
  locationCount: number;
  classCount: number;
}): boolean {
  return (
    input.locationCount >= SEO_QUALITY_THRESHOLDS.gradeMinLocations &&
    input.classCount >= SEO_QUALITY_THRESHOLDS.gradeMinClasses
  );
}

export function shouldIndexClassCodePage(input: {
  contractorCount: number;
  leafPageCount: number;
}): boolean {
  return (
    input.contractorCount >= SEO_QUALITY_THRESHOLDS.classMinContractors &&
    input.leafPageCount >= SEO_QUALITY_THRESHOLDS.classMinLeafPages
  );
}
