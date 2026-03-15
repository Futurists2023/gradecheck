export type MonitoringRouteType =
  | "province"
  | "city"
  | "leaf"
  | "contractor"
  | "grade"
  | "class";

export type MonitoringIndexState = "index" | "noindex";

export type MonitoringVerdict =
  | "incubate"
  | "observe"
  | "grow"
  | "prune"
  | "deindex"
  | "investigate";

export type MonitoringActionType = "grow" | "prune" | "deindex" | "investigate";

export type MonitoringApprovalDecision = "approved" | "rejected";

export type MonitoringEventName =
  | "page_view_start"
  | "page_view_end"
  | "leaf_click"
  | "profile_open"
  | "verify_open"
  | "shortlist_add"
  | "compare_select"
  | "source_click";

export interface MonitoringPageCatalogRow {
  href: string;
  route_type: MonitoringRouteType;
  template_cluster: MonitoringRouteType;
  intended_index_state: MonitoringIndexState;
  quality_qualified: boolean;
  within_budget: boolean;
  current_effective_index_state: MonitoringIndexState;
  default_priority: number;
  effective_priority: number;
  page_metadata: Record<string, boolean | number | string | null>;
  updated_at?: string;
}

export interface MonitoringGscDailyRow {
  snapshot_date: string;
  href: string;
  submitted: boolean;
  indexed: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number | null;
}

export interface MonitoringGa4DailyRow {
  snapshot_date: string;
  href: string;
  sessions: number;
  engaged_sessions: number;
  views: number;
}

export interface MonitoringPageDailyRollup {
  snapshot_date: string;
  href: string;
  route_type: MonitoringRouteType;
  template_cluster: MonitoringRouteType;
  intended_index_state: MonitoringIndexState;
  current_effective_index_state: MonitoringIndexState;
  submitted_pages: number;
  indexed_pages: number;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number | null;
  sessions: number;
  engaged_sessions: number;
  views: number;
  next_step_sessions: number;
  low_value_exit_sessions: number;
  source_click_sessions: number;
  page_view_sessions: number;
}

export interface MonitoringClusterDailyRollup {
  snapshot_date: string;
  route_type: MonitoringRouteType;
  template_cluster: MonitoringRouteType;
  intended_index_pages: number;
  effective_index_pages: number;
  submitted_pages: number;
  indexed_pages: number;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number | null;
  sessions: number;
  engaged_sessions: number;
  views: number;
  next_step_sessions: number;
  low_value_exit_sessions: number;
  source_click_sessions: number;
  page_view_sessions: number;
}

export interface MonitoringThresholdSet {
  indexedRateGrowMin: number;
  impressionsPerIndexedGrowMin: number;
  clicksPerIndexedGrowMin: number;
  ctrGrowMin: number;
  engagementGrowMin: number;
  nextStepGrowMin: number;
  lowValueExitGrowMax: number;
  indexedRatePruneMax: number;
  impressionsPerIndexedPruneMax: number;
  clicksPerIndexedPruneMax: number;
  ctrPruneMax: number;
  averagePositionPruneMax: number;
  engagementPruneMax: number;
  nextStepPruneMax: number;
  lowValueExitPruneMin: number;
  indexedRateDeindexMax: number;
  impressionsPerIndexedDeindexMax: number;
  clicksPerIndexedDeindexMax: number;
  ctrDeindexMax: number;
  engagementDeindexMax: number;
  nextStepDeindexMax: number;
  lowValueExitDeindexMin: number;
}

export interface MonitoringComputedMetrics {
  indexedRate: number;
  impressionsPerIndexedPage: number;
  clicksPerIndexedPage: number;
  ctr: number;
  goodEngagementRate: number;
  nextStepRate: number;
  lowValueExitRate: number;
  averagePosition: number | null;
  indexedPages: number;
  submittedPages: number;
  impressions: number;
  clicks: number;
  sessions: number;
  engagedSessions: number;
  nextStepSessions: number;
  lowValueExitSessions: number;
  sourceClickSessions: number;
}

export interface MonitoringReviewSignals {
  enoughDataAge: boolean;
  enoughIndexIntendedPages: boolean;
  canonicalHealthPass: boolean;
  freshnessPass: boolean;
  evidencePass: boolean;
  internalLinkSupportPass: boolean;
  qualityFloorPass: boolean;
  importHealthPass: boolean;
  telemetryHealthPass: boolean;
  impressionGuardPass: boolean;
  sessionGuardPass: boolean;
}

export interface MonitoringReviewRecord {
  review_date: string;
  route_type: MonitoringRouteType;
  template_cluster: MonitoringRouteType;
  window_days: number;
  metrics: MonitoringComputedMetrics;
  previous_metrics: MonitoringComputedMetrics | null;
  gates: MonitoringReviewSignals;
  triggered_rules: {
    grow: string[];
    prune: string[];
    deindex: string[];
  };
  reason_codes: string[];
  recommended_verdict: MonitoringVerdict;
  recommended_action: MonitoringActionType | null;
}

export interface MonitoringOverview {
  latestReviewDate: string | null;
  latestGscDate: string | null;
  latestGa4Date: string | null;
  latestActionEventAt: string | null;
  verdictCounts: Array<{
    routeType: MonitoringRouteType;
    verdict: MonitoringVerdict;
    total: number;
  }>;
  pendingApprovals: Array<{
    routeType: MonitoringRouteType;
    verdict: MonitoringVerdict;
    actionType: MonitoringActionType;
    reasonCodes: string[];
    reviewDate: string;
  }>;
  activeApprovals: Array<{
    routeType: MonitoringRouteType;
    actionType: MonitoringActionType;
    decision: MonitoringApprovalDecision;
    actor: string;
    effectiveFrom: string;
    expiresOn: string | null;
  }>;
}

export interface MonitoringClusterListItem {
  routeType: MonitoringRouteType;
  verdict: MonitoringVerdict;
  actionType: MonitoringActionType | null;
  reviewDate: string;
  indexedRate: number;
  impressionsPerIndexedPage: number;
  clicksPerIndexedPage: number;
  ctr: number;
  goodEngagementRate: number;
  nextStepRate: number;
  lowValueExitRate: number;
  reasonCodes: string[];
}

export interface MonitoringClusterDetail {
  latest30DayReview: MonitoringReviewRecord | null;
  latest60DayReview: MonitoringReviewRecord | null;
  dailyTrend: MonitoringClusterDailyRollup[];
  topPages: MonitoringPageDailyRollup[];
  weakPages: MonitoringPageDailyRollup[];
  approvalHistory: Array<{
    id: number;
    routeType: MonitoringRouteType;
    actionType: MonitoringActionType;
    decision: MonitoringApprovalDecision;
    actor: string;
    note: string | null;
    effectiveFrom: string;
    expiresOn: string | null;
    createdAt: string;
  }>;
}
