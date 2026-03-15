"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { ExpiryCountdown } from "@/components/ExpiryCountdown";
import { trackMonitoringEvent } from "@/components/MonitoringTracker";
import { PEBadge } from "@/components/PEBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { TrackingLink } from "@/components/TrackingLink";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cn,
  buildContractorHref,
  formatDateTime,
  sortStatuses,
} from "@/lib/utils";
import type { ContractorWithGradings } from "@/types";

type LeafContractorExplorerProps = {
  classCode: string;
  classLabel: string;
  city: string;
  contractors: ContractorWithGradings[];
  gradeLevel: number;
};

type ViewFilter = "all" | "active" | "pe" | "expiring";

const FILTER_LABELS: Record<ViewFilter, string> = {
  all: "All matches",
  active: "Active only",
  pe: "PE only",
  expiring: "Expiring soon",
};

const RESULTS_PER_PAGE = 10;

function isExpiringSoon(contractor: ContractorWithGradings) {
  if (contractor.registration_status !== "Active" || !contractor.expiry_date) {
    return false;
  }

  const expiry = new Date(contractor.expiry_date);
  const now = new Date();
  const daysToExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysToExpiry >= 0 && daysToExpiry <= 180;
}

export function LeafContractorExplorer({
  classCode,
  classLabel,
  city,
  contractors,
  gradeLevel,
}: LeafContractorExplorerProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleContractors = contractors
    .filter((contractor) => {
      if (view === "active" && contractor.registration_status !== "Active") {
        return false;
      }

      if (view === "pe" && !contractor.pe_flag) {
        return false;
      }

      if (view === "expiring" && !isExpiringSoon(contractor)) {
        return false;
      }

      if (!deferredQuery) {
        return true;
      }

      return [
        contractor.contractor_name,
        contractor.trading_name ?? "",
        contractor.crs_number,
      ].some((value) => value.toLowerCase().includes(deferredQuery));
    })
    .sort((left, right) => {
      const statusComparison =
        sortStatuses(left.registration_status) -
        sortStatuses(right.registration_status);

      if (statusComparison !== 0) {
        return statusComparison;
      }

      const gradingComparison = right.gradings.length - left.gradings.length;
      if (gradingComparison !== 0) {
        return gradingComparison;
      }

      return left.contractor_name.localeCompare(right.contractor_name);
    });

  const shortlistedContractors = contractors.filter((contractor) =>
    shortlistIds.includes(contractor.crs_number),
  );
  const comparedContractors = contractors.filter((contractor) =>
    compareIds.includes(contractor.crs_number),
  );
  const totalPages = Math.max(1, Math.ceil(visibleContractors.length / RESULTS_PER_PAGE));
  const paginatedContractors = visibleContractors.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE,
  );

  useEffect(() => {
    if (!compareModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompareModalOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [compareModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredQuery, view]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleShortlist = (crsNumber: string) => {
    void trackMonitoringEvent({
      eventName: "shortlist_add",
      href: window.location.pathname,
      metadata: { contractorCrs: crsNumber },
    });
    setShortlistIds((current) =>
      current.includes(crsNumber)
        ? current.filter((value) => value !== crsNumber)
        : [...current, crsNumber],
    );
  };

  const toggleCompare = (crsNumber: string) => {
    void trackMonitoringEvent({
      eventName: "compare_select",
      href: window.location.pathname,
      metadata: { contractorCrs: crsNumber },
    });
    setCompareIds((current) => {
      if (current.includes(crsNumber)) {
        return current.filter((value) => value !== crsNumber);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, crsNumber];
    });
  };

  const copyShortlistSummary = async () => {
    const summary = [
      `Shortlist for Grade ${gradeLevel} ${classLabel} contractors in ${city}`,
      ...shortlistedContractors.map((contractor) => {
        const highestGrade = contractor.gradings.reduce(
          (highest, grading) => Math.max(highest, grading.grade_level),
          gradeLevel,
        );

        return `- ${contractor.contractor_name} | CRS ${contractor.crs_number} | ${contractor.registration_status} | Highest grade ${highestGrade} | ${contractor.pe_flag ? "PE" : "Non-PE"}`;
      }),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="space-y-6">
      {shortlistedContractors.length > 0 || comparedContractors.length > 0 ? (
        <>
          <div className="fixed inset-x-0 top-[4.75rem] z-30 px-4 sm:px-6 lg:px-8">
            <div className="container-shell">
              <div className="rounded-[1.5rem] border border-primary/30 bg-[linear-gradient(135deg,rgba(10,117,140,0.96),rgba(14,89,108,0.96))] p-4 text-white shadow-paper backdrop-blur">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-white/80">
                      Active Screening Session
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                        {shortlistedContractors.length} shortlisted
                      </span>
                      <span className="hidden text-white/45 sm:inline">•</span>
                      <span className="text-lg font-bold text-white/90 sm:text-2xl">
                        {comparedContractors.length} selected for compare
                      </span>
                      {copyState === "copied" ? (
                        <Badge
                          variant="secondary"
                          className="border-white/20 bg-white/20 text-white"
                        >
                          Summary copied
                        </Badge>
                      ) : null}
                      {copyState === "failed" ? (
                        <Badge variant="destructive" className="border-transparent">
                          Copy failed
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {shortlistedContractors.length > 0 ? (
                      <button
                        type="button"
                        onClick={copyShortlistSummary}
                        className={cn(
                          buttonVariants({ variant: "default" }),
                          "bg-white text-primary hover:bg-white/90",
                        )}
                      >
                        Copy shortlist summary
                      </button>
                    ) : null}
                    {shortlistedContractors.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShortlistIds([]);
                          setCopyState("idle");
                        }}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "border-white/30 bg-white/10 text-white hover:bg-white/20",
                        )}
                      >
                        Clear shortlist
                      </button>
                    ) : null}
                    {comparedContractors.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCompareModalOpen(true)}
                        className={cn(
                          buttonVariants({ variant: "default" }),
                          "bg-white text-primary hover:bg-white/90",
                        )}
                      >
                        Open compare modal
                      </button>
                    ) : null}
                    {comparedContractors.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCompareIds([])}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "border-white/30 bg-white/10 text-white hover:bg-white/20",
                        )}
                      >
                        Clear compare
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-28 sm:h-24" aria-hidden="true" />
        </>
      ) : null}

      {compareModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          onClick={() => setCompareModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-[2rem] border border-white/70 bg-background/95 p-5 shadow-paper"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCompareModalOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-border bg-white p-2 text-muted-foreground hover:text-foreground"
              aria-label="Close compare modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-6">
              <div className="max-w-3xl space-y-2 pr-12">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Compare contractors
                </p>
                <h3
                  id="compare-modal-title"
                  className="font-serif text-3xl font-semibold"
                >
                  Review up to three shortlisted candidates side-by-side
                </h3>
                <p className="text-muted-foreground">
                  Compare status, expiry, grading breadth, freshness, and direct
                  verification actions before you commit to a final shortlist.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {comparedContractors.map((contractor, index) => {
                  const highestGrade = contractor.gradings.reduce(
                    (highest, grading) =>
                      Math.max(highest, grading.grade_level),
                    gradeLevel,
                  );

                  return (
                    <Card
                      key={contractor.crs_number}
                      className={cn(
                        "h-full border-primary/10 bg-white/95 transition-transform duration-200",
                        index === 1 ? "xl:-translate-y-2" : "",
                      )}
                    >
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge
                            status={contractor.registration_status}
                          />
                          <PEBadge pe_flag={contractor.pe_flag} />
                        </div>
                        <CardTitle className="font-serif text-2xl">
                          {contractor.contractor_name}
                        </CardTitle>
                        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                          CRS {contractor.crs_number}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl border border-border bg-secondary/40 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Highest grade held
                            </p>
                            <p className="mt-2 text-lg font-semibold">
                              Grade {highestGrade}
                            </p>
                          </div>
                          <div className="rounded-3xl border border-border bg-secondary/40 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Total gradings
                            </p>
                            <p className="mt-2 text-lg font-semibold">
                              {contractor.gradings.length}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Expiry
                          </p>
                          <div className="mt-2">
                            <ExpiryCountdown
                              expiry_date={contractor.expiry_date}
                              status={contractor.registration_status}
                            />
                          </div>
                        </div>

                        <div className="rounded-3xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Last captured
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {formatDateTime(contractor.captured_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {contractor.gradings.map((grading) => (
                            <Badge
                              key={grading.id}
                              variant="outline"
                              className="bg-white"
                            >
                              Grade {grading.grade_level} {grading.class_code}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <TrackingLink
                            href={buildContractorHref(
                              contractor.crs_number,
                              contractor.contractor_name,
                            )}
                            eventName="profile_open"
                            className={cn(
                              buttonVariants({ variant: "default" }),
                              "flex-1",
                            )}
                          >
                            Open profile
                          </TrackingLink>
                          <TrackingLink
                            href={contractor.source_url}
                            trackingHref={buildContractorHref(
                              contractor.crs_number,
                              contractor.contractor_name,
                            )}
                            eventName="source_click"
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              buttonVariants({ variant: "outline" }),
                              "flex-1",
                            )}
                          >
                            Verify on CIDB
                          </TrackingLink>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Shortlist and compare contractors now
            </p>
          </div>
          <div className="w-full max-w-md">
            <Input
              aria-label="Search contractors in this page"
              placeholder="Search by contractor name, trading name, or CRS"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {(["all", "active", "pe", "expiring"] as ViewFilter[]).map(
            (filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setView(filterKey)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  view === filterKey
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-secondary",
                )}
              >
                {FILTER_LABELS[filterKey]}
              </button>
            ),
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {visibleContractors.length} contractors match the current view.
          </span>
          <span>
            Showing {(currentPage - 1) * RESULTS_PER_PAGE + 1}-
            {Math.min(currentPage * RESULTS_PER_PAGE, visibleContractors.length)}.
          </span>
          {view !== "all" ? (
            <Badge variant="secondary">{FILTER_LABELS[view]}</Badge>
          ) : null}
          {deferredQuery ? (
            <Badge variant="outline">Search: {query}</Badge>
          ) : null}
          <Badge variant="outline">Compare up to 3 contractors</Badge>
        </div>
      </div>

      {visibleContractors.length > 0 ? (
        <div className="space-y-5">
          <div className="grid gap-4">
            {paginatedContractors.map((contractor) => {
            const broaderCoverageCount = contractor.gradings.filter(
              (grading) =>
                !(
                  grading.grade_level === gradeLevel &&
                  grading.class_code === classCode
                ),
            ).length;

            return (
              <article
                key={contractor.crs_number}
                className="surface overflow-hidden p-6"
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={contractor.registration_status} />
                    <PEBadge pe_flag={contractor.pe_flag} />
                    {isExpiringSoon(contractor) ? (
                      <Badge variant="secondary">Expiring within 6 months</Badge>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-semibold">
                      <TrackingLink
                        href={buildContractorHref(
                          contractor.crs_number,
                          contractor.contractor_name,
                        )}
                        eventName="profile_open"
                        className="hover:text-primary"
                      >
                        {contractor.contractor_name}
                      </TrackingLink>
                    </h3>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      CRS {contractor.crs_number}
                    </p>
                    {contractor.trading_name ? (
                      <p className="text-sm text-muted-foreground">
                        Trading name: {contractor.trading_name}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-secondary/70 px-3 py-1.5 font-medium text-secondary-foreground">
                      Match reason: Grade {gradeLevel} {classLabel} in {city}
                    </span>
                    <span className="rounded-full bg-secondary/70 px-3 py-1.5 font-medium text-secondary-foreground">
                      Broader capability: {broaderCoverageCount} additional grading
                      {broaderCoverageCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {contractor.gradings.map((grading) => (
                      <Badge
                        key={grading.id}
                        variant="outline"
                        className="bg-white"
                      >
                        Grade {grading.grade_level} {grading.class_code}
                      </Badge>
                    ))}
                  </div>

                  <div className="rounded-[1.35rem] border border-border/80 bg-muted/35 p-4">
                    <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                          Contractor Review Panel
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Compact decision signals and actions.
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                        Live
                      </div>
                    </div>

                    <div className="grid gap-2 border-b border-border/70 py-3 sm:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.2fr_1fr_1fr]">
                      <div className="rounded-2xl bg-white/85 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          Expiry
                        </p>
                        <div className="mt-1.5">
                          <ExpiryCountdown
                            expiry_date={contractor.expiry_date}
                            status={contractor.registration_status}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/85 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          Last captured
                        </p>
                        <p className="mt-1.5 text-sm font-medium">
                          {formatDateTime(contractor.captured_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/85 p-3 sm:col-span-2 lg:col-span-1">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          Workflow state
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-foreground">
                          {shortlistIds.includes(contractor.crs_number)
                            ? "Shortlisted"
                            : compareIds.includes(contractor.crs_number)
                              ? "Selected for compare"
                              : "Ready to review"}
                        </p>
                      </div>
                    </div>

                    <div className="border-b border-border/70 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                        Screening
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => toggleShortlist(contractor.crs_number)}
                          className={cn(
                            buttonVariants({
                              variant: shortlistIds.includes(contractor.crs_number)
                                ? "default"
                                : "outline",
                            }),
                            "h-10 w-full text-xs",
                          )}
                        >
                          {shortlistIds.includes(contractor.crs_number)
                            ? "Shortlisted"
                            : "Add to shortlist"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCompare(contractor.crs_number)}
                          disabled={
                            !compareIds.includes(contractor.crs_number) &&
                            compareIds.length >= 3
                          }
                          className={cn(
                            buttonVariants({
                              variant: compareIds.includes(contractor.crs_number)
                                ? "default"
                                : "outline",
                            }),
                            "h-10 w-full text-xs",
                          )}
                        >
                          {compareIds.includes(contractor.crs_number)
                            ? "Selected for compare"
                            : "Compare"}
                        </button>
                        <TrackingLink
                          href={buildContractorHref(
                            contractor.crs_number,
                            contractor.contractor_name,
                          )}
                          eventName="profile_open"
                          className={cn(
                            buttonVariants({ variant: "default" }),
                            "h-10 w-full text-xs",
                          )}
                        >
                          View verification profile
                        </TrackingLink>
                        <TrackingLink
                          href={contractor.source_url}
                          trackingHref={buildContractorHref(
                            contractor.crs_number,
                            contractor.contractor_name,
                          )}
                          eventName="source_click"
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "h-10 w-full text-xs",
                          )}
                        >
                          Verify on CIDB
                        </TrackingLink>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((page) => {
                    if (totalPages <= 5) {
                      return true;
                    }

                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, index, pages) => {
                    const previousPage = pages[index - 1];
                    const showGap = previousPage && page - previousPage > 1;

                    return (
                      <div key={page} className="flex items-center gap-2">
                        {showGap ? (
                          <span className="px-2 text-sm text-muted-foreground">...</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            buttonVariants({
                              variant: page === currentPage ? "default" : "outline",
                            }),
                            "min-w-10 px-3",
                          )}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center">
          <h3 className="font-serif text-2xl font-semibold">
            No contractors match this filter
          </h3>
          <p className="mt-3 text-muted-foreground">
            Try switching back to All matches or removing the search term to
            reopen the full shortlist.
          </p>
        </div>
      )}
    </div>
  );
}
