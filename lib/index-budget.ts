import "server-only";

import manifest from "@/generated/launch-index-manifest.json";
import { getRobotsForQuality } from "@/lib/indexing";
import type { MonitoringManifest } from "@/lib/monitoring";

export async function getLaunchIndexManifest() {
  const typedManifest = manifest as MonitoringManifest;

  return {
    allowed: new Set<string>(typedManifest.allowed),
    totalBudget: typedManifest.totalBudget,
    contractorBudget: typedManifest.contractorBudget,
    priorityByPath: typedManifest.priorityByPath ?? {},
    clusterActions: typedManifest.clusterActions ?? {},
  };
}

export async function shouldLaunchIndexHref(href: string): Promise<boolean> {
  const launchManifest = await getLaunchIndexManifest();
  return launchManifest.allowed.has(href);
}

export async function getLaunchRobotsForHref(href: string, isQualityQualified: boolean) {
  if (!isQualityQualified) {
    return getRobotsForQuality(false);
  }

  return getRobotsForQuality(await shouldLaunchIndexHref(href));
}
