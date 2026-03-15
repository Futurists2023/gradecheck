import type {
  MonitoringActionType,
  MonitoringComputedMetrics,
  MonitoringEventName,
  MonitoringIndexState,
  MonitoringReviewSignals,
  MonitoringRouteType,
  MonitoringThresholdSet,
  MonitoringVerdict,
} from "@/types/monitoring";

export const MONITORED_ROUTE_TYPES: MonitoringRouteType[] = [
  "province",
  "city",
  "leaf",
  "contractor",
  "grade",
  "class",
];

export const NEXT_STEP_EVENT_NAMES: MonitoringEventName[] = [
  "leaf_click",
  "profile_open",
  "verify_open",
  "shortlist_add",
  "compare_select",
];

export const BASE_MONITORING_THRESHOLDS: MonitoringThresholdSet = {
  indexedRateGrowMin: 0.6,
  impressionsPerIndexedGrowMin: 20,
  clicksPerIndexedGrowMin: 1.5,
  ctrGrowMin: 0.025,
  engagementGrowMin: 0.45,
  nextStepGrowMin: 0.12,
  lowValueExitGrowMax: 0.65,
  indexedRatePruneMax: 0.4,
  impressionsPerIndexedPruneMax: 10,
  clicksPerIndexedPruneMax: 0.5,
  ctrPruneMax: 0.015,
  averagePositionPruneMax: 35,
  engagementPruneMax: 0.35,
  nextStepPruneMax: 0.08,
  lowValueExitPruneMin: 0.75,
  indexedRateDeindexMax: 0.2,
  impressionsPerIndexedDeindexMax: 3,
  clicksPerIndexedDeindexMax: 0.2,
  ctrDeindexMax: 0.01,
  engagementDeindexMax: 0.25,
  nextStepDeindexMax: 0.05,
  lowValueExitDeindexMin: 0.85,
};

export const MONITORING_DENOMINATOR_GUARDS = {
  minImpressions: 500,
  minSessions: 150,
  minDaysSinceEligible: 30,
  minDaysBeforeDeindex: 45,
  minIndexIntendedPagesForPrune: 20,
  freshnessMaxDays: 45,
  importStalenessMaxDays: 7,
  evidenceCoverageMin: 0.8,
  internalLinkCoverageMin: 0.5,
} as const;

export type MonitoringManifest = {
  generatedAt: string;
  totalBudget: number;
  contractorBudget: number;
  allowed: string[];
  priorityByPath?: Record<string, number>;
  clusterActions?: Record<string, MonitoringActionType>;
};

export function normalizeMonitoringHref(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? new URL(trimmed)
      : new URL(trimmed, "https://gradecheck.internal");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return pathname === "" ? "/" : pathname.toLowerCase();
  } catch {
    return null;
  }
}

export function detectMonitoringRouteType(href: string): MonitoringRouteType | null {
  if (/^\/cidb-contractor\/[^/]+$/.test(href)) {
    return "contractor";
  }

  if (/^\/cidb-contractors\/[^/]+\/[^/]+\/grade-\d+\/[^/]+$/.test(href)) {
    return "leaf";
  }

  if (/^\/cidb-contractors\/[^/]+\/[^/]+$/.test(href)) {
    return "city";
  }

  if (/^\/cidb-contractors\/[^/]+$/.test(href)) {
    return "province";
  }

  if (/^\/cidb-grades\/cidb-grade-\d+$/.test(href)) {
    return "grade";
  }

  if (/^\/cidb-class-codes\/[^/]+$/.test(href)) {
    return "class";
  }

  return null;
}

export function getMonitoringThresholds(routeType: MonitoringRouteType): MonitoringThresholdSet {
  const next = { ...BASE_MONITORING_THRESHOLDS };

  switch (routeType) {
    case "leaf":
      next.clicksPerIndexedGrowMin *= 1.2;
      next.ctrGrowMin *= 1.2;
      next.nextStepGrowMin *= 1.2;
      break;
    case "city":
      next.clicksPerIndexedGrowMin *= 0.75;
      next.ctrGrowMin *= 0.75;
      next.clicksPerIndexedPruneMax *= 0.75;
      next.ctrPruneMax *= 0.75;
      next.clicksPerIndexedDeindexMax *= 0.75;
      next.ctrDeindexMax *= 0.75;
      next.nextStepGrowMin *= 1.25;
      next.nextStepPruneMax *= 1.25;
      next.nextStepDeindexMax *= 1.25;
      break;
    case "province":
      next.clicksPerIndexedGrowMin *= 0.5;
      next.ctrGrowMin *= 0.5;
      next.clicksPerIndexedPruneMax *= 0.5;
      next.ctrPruneMax *= 0.5;
      next.clicksPerIndexedDeindexMax *= 0.5;
      next.ctrDeindexMax *= 0.5;
      break;
    case "contractor":
      next.engagementGrowMin *= 1.25;
      next.nextStepGrowMin *= 1.25;
      next.engagementPruneMax *= 1.25;
      next.nextStepPruneMax *= 1.25;
      next.engagementDeindexMax *= 1.25;
      next.nextStepDeindexMax *= 1.25;
      break;
    case "class":
      next.clicksPerIndexedGrowMin *= 0.75;
      next.clicksPerIndexedPruneMax *= 0.75;
      next.clicksPerIndexedDeindexMax *= 0.75;
      break;
    case "grade":
      break;
  }

  return next;
}

export function computeMonitoringMetrics(input: {
  submittedPages: number;
  indexedPages: number;
  impressions: number;
  clicks: number;
  averagePosition: number | null;
  sessions: number;
  engagedSessions: number;
  nextStepSessions: number;
  lowValueExitSessions: number;
  sourceClickSessions: number;
}): MonitoringComputedMetrics {
  const submittedPages = Math.max(input.submittedPages, 0);
  const indexedPages = Math.max(input.indexedPages, 0);
  const impressions = Math.max(input.impressions, 0);
  const clicks = Math.max(input.clicks, 0);
  const sessions = Math.max(input.sessions, 0);
  const engagedSessions = Math.max(input.engagedSessions, 0);
  const nextStepSessions = Math.max(input.nextStepSessions, 0);
  const lowValueExitSessions = Math.max(input.lowValueExitSessions, 0);
  const sourceClickSessions = Math.max(input.sourceClickSessions, 0);

  return {
    indexedRate: submittedPages > 0 ? indexedPages / submittedPages : 0,
    impressionsPerIndexedPage: indexedPages > 0 ? impressions / indexedPages : 0,
    clicksPerIndexedPage: indexedPages > 0 ? clicks / indexedPages : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
    goodEngagementRate: sessions > 0 ? engagedSessions / sessions : 0,
    nextStepRate: sessions > 0 ? nextStepSessions / sessions : 0,
    lowValueExitRate: sessions > 0 ? lowValueExitSessions / sessions : 0,
    averagePosition: input.averagePosition,
    indexedPages,
    submittedPages,
    impressions,
    clicks,
    sessions,
    engagedSessions,
    nextStepSessions,
    lowValueExitSessions,
    sourceClickSessions,
  };
}

function evaluateWindowRuleHits(
  metrics: MonitoringComputedMetrics,
  thresholds: MonitoringThresholdSet,
  mode: "prune" | "deindex",
): number {
  const rules =
    mode === "prune"
      ? [
          metrics.indexedRate < thresholds.indexedRatePruneMax,
          metrics.impressionsPerIndexedPage < thresholds.impressionsPerIndexedPruneMax,
          metrics.clicksPerIndexedPage < thresholds.clicksPerIndexedPruneMax,
          metrics.ctr < thresholds.ctrPruneMax &&
            metrics.averagePosition !== null &&
            metrics.averagePosition < thresholds.averagePositionPruneMax,
          metrics.goodEngagementRate < thresholds.engagementPruneMax,
          metrics.nextStepRate < thresholds.nextStepPruneMax,
          metrics.lowValueExitRate >= thresholds.lowValueExitPruneMin,
        ]
      : [
          metrics.indexedRate < thresholds.indexedRateDeindexMax,
          metrics.impressionsPerIndexedPage < thresholds.impressionsPerIndexedDeindexMax,
          metrics.clicksPerIndexedPage < thresholds.clicksPerIndexedDeindexMax,
          metrics.ctr < thresholds.ctrDeindexMax,
          metrics.goodEngagementRate < thresholds.engagementDeindexMax,
          metrics.nextStepRate < thresholds.nextStepDeindexMax,
          metrics.lowValueExitRate >= thresholds.lowValueExitDeindexMin,
        ];

  return rules.filter(Boolean).length;
}

export function evaluateMonitoringRules(
  routeType: MonitoringRouteType,
  metrics: MonitoringComputedMetrics,
  previousMetrics: MonitoringComputedMetrics | null,
  signals: MonitoringReviewSignals,
  options: {
    clusterAgeDays: number;
  },
): {
  verdict: MonitoringVerdict;
  action: MonitoringActionType | null;
  triggeredRules: {
    grow: string[];
    prune: string[];
    deindex: string[];
  };
  reasonCodes: string[];
} {
  const thresholds = getMonitoringThresholds(routeType);
  const reasonCodes: string[] = [];

  if (
    !signals.canonicalHealthPass ||
    !signals.freshnessPass ||
    !signals.evidencePass ||
    !signals.importHealthPass ||
    !signals.telemetryHealthPass ||
    !signals.qualityFloorPass
  ) {
    if (!signals.canonicalHealthPass) {
      reasonCodes.push("canonical_health_failed");
    }

    if (!signals.freshnessPass) {
      reasonCodes.push("freshness_failed");
    }

    if (!signals.evidencePass) {
      reasonCodes.push("evidence_failed");
    }

    if (!signals.importHealthPass) {
      reasonCodes.push("import_health_failed");
    }

    if (!signals.telemetryHealthPass) {
      reasonCodes.push("telemetry_health_failed");
    }

    if (!signals.qualityFloorPass) {
      reasonCodes.push("quality_floor_failed");
    }

    return {
      verdict: "investigate",
      action: "investigate",
      triggeredRules: { grow: [], prune: [], deindex: [] },
      reasonCodes,
    };
  }

  if (!signals.enoughDataAge || !signals.impressionGuardPass || !signals.sessionGuardPass) {
    if (!signals.enoughDataAge) {
      reasonCodes.push("not_enough_age");
    }

    if (!signals.impressionGuardPass) {
      reasonCodes.push("insufficient_impressions");
    }

    if (!signals.sessionGuardPass) {
      reasonCodes.push("insufficient_sessions");
    }

    return {
      verdict: "incubate",
      action: null,
      triggeredRules: { grow: [], prune: [], deindex: [] },
      reasonCodes,
    };
  }

  const grow: string[] = [];
  const prune: string[] = [];
  const deindex: string[] = [];

  if (metrics.indexedRate >= thresholds.indexedRateGrowMin) {
    grow.push("indexed_rate");
  } else if (metrics.indexedRate < thresholds.indexedRatePruneMax) {
    prune.push("indexed_rate");
  }

  if (metrics.indexedRate < thresholds.indexedRateDeindexMax) {
    deindex.push("indexed_rate");
  }

  if (metrics.impressionsPerIndexedPage >= thresholds.impressionsPerIndexedGrowMin) {
    grow.push("impressions_per_indexed_page");
  } else if (metrics.impressionsPerIndexedPage < thresholds.impressionsPerIndexedPruneMax) {
    prune.push("impressions_per_indexed_page");
  }

  if (metrics.impressionsPerIndexedPage < thresholds.impressionsPerIndexedDeindexMax) {
    deindex.push("impressions_per_indexed_page");
  }

  if (metrics.clicksPerIndexedPage >= thresholds.clicksPerIndexedGrowMin) {
    grow.push("clicks_per_indexed_page");
  } else if (metrics.clicksPerIndexedPage < thresholds.clicksPerIndexedPruneMax) {
    prune.push("clicks_per_indexed_page");
  }

  if (metrics.clicksPerIndexedPage < thresholds.clicksPerIndexedDeindexMax) {
    deindex.push("clicks_per_indexed_page");
  }

  if (metrics.ctr >= thresholds.ctrGrowMin) {
    grow.push("ctr");
  } else if (
    metrics.ctr < thresholds.ctrPruneMax &&
    metrics.averagePosition !== null &&
    metrics.averagePosition < thresholds.averagePositionPruneMax
  ) {
    prune.push("ctr");
  }

  if (metrics.ctr < thresholds.ctrDeindexMax) {
    deindex.push("ctr");
  }

  if (metrics.goodEngagementRate >= thresholds.engagementGrowMin) {
    grow.push("good_engagement_rate");
  } else if (metrics.goodEngagementRate < thresholds.engagementPruneMax) {
    prune.push("good_engagement_rate");
  }

  if (metrics.goodEngagementRate < thresholds.engagementDeindexMax) {
    deindex.push("good_engagement_rate");
  }

  if (metrics.nextStepRate >= thresholds.nextStepGrowMin) {
    grow.push("next_step_rate");
  } else if (metrics.nextStepRate < thresholds.nextStepPruneMax) {
    prune.push("next_step_rate");
  }

  if (metrics.nextStepRate < thresholds.nextStepDeindexMax) {
    deindex.push("next_step_rate");
  }

  if (metrics.lowValueExitRate < thresholds.lowValueExitGrowMax) {
    grow.push("low_value_exit_rate");
  } else if (metrics.lowValueExitRate >= thresholds.lowValueExitPruneMin) {
    prune.push("low_value_exit_rate");
  }

  if (metrics.lowValueExitRate >= thresholds.lowValueExitDeindexMin) {
    deindex.push("low_value_exit_rate");
  }

  const previousThresholdsMet = previousMetrics
    ? {
        prune:
          evaluateWindowRuleHits(previousMetrics, thresholds, "prune") >= 2 &&
          signals.enoughIndexIntendedPages,
        deindex:
          evaluateWindowRuleHits(previousMetrics, thresholds, "deindex") >= 3 &&
          options.clusterAgeDays >= MONITORING_DENOMINATOR_GUARDS.minDaysBeforeDeindex,
      }
    : {
        prune: false,
        deindex: false,
      };

  if (routeType === "grade" && !(grow.includes("impressions_per_indexed_page") && grow.includes("good_engagement_rate"))) {
    reasonCodes.push("grade_bias_observe");
  } else if (grow.length === 7) {
    return {
      verdict: "grow",
      action: "grow",
      triggeredRules: { grow, prune, deindex },
      reasonCodes,
    };
  }

  if (
    deindex.length >= 3 &&
    previousThresholdsMet.deindex &&
    signals.enoughIndexIntendedPages &&
    metrics.nextStepRate < thresholds.nextStepDeindexMax
  ) {
    reasonCodes.push("two_consecutive_deindex_windows");
    return {
      verdict: "deindex",
      action: "deindex",
      triggeredRules: { grow, prune, deindex },
      reasonCodes,
    };
  }

  if (prune.length >= 2 && previousThresholdsMet.prune && signals.enoughIndexIntendedPages) {
    reasonCodes.push("two_consecutive_prune_windows");
    return {
      verdict: "prune",
      action: "prune",
      triggeredRules: { grow, prune, deindex },
      reasonCodes,
    };
  }

  return {
    verdict: "observe",
    action: null,
    triggeredRules: { grow, prune, deindex },
    reasonCodes,
  };
}

export function buildDefaultPagePriority(routeType: MonitoringRouteType): number {
  switch (routeType) {
    case "leaf":
      return 0.8;
    case "city":
      return 0.72;
    case "province":
      return 0.68;
    case "contractor":
      return 0.65;
    case "grade":
    case "class":
      return 0.62;
  }
}

export function resolveEffectiveIndexState(input: {
  qualityQualified: boolean;
  withinBudget: boolean;
  approvedAction: MonitoringActionType | null;
  keepIndexedByPrune?: boolean;
}): MonitoringIndexState {
  if (!input.qualityQualified) {
    return "noindex";
  }

  if (input.approvedAction === "deindex") {
    return "noindex";
  }

  if (input.approvedAction === "grow") {
    return "index";
  }

  if (input.approvedAction === "prune") {
    return input.keepIndexedByPrune ? "index" : "noindex";
  }

  return input.withinBudget ? "index" : "noindex";
}

export function resolveEffectivePriority(input: {
  routeType: MonitoringRouteType;
  currentState: MonitoringIndexState;
  approvedAction: MonitoringActionType | null;
}): number {
  if (input.currentState === "noindex") {
    return 0;
  }

  const base = buildDefaultPagePriority(input.routeType);

  if (input.approvedAction === "grow") {
    return Math.min(base + 0.15, 0.95);
  }

  if (input.approvedAction === "prune") {
    return Math.max(base - 0.1, 0.45);
  }

  return base;
}
