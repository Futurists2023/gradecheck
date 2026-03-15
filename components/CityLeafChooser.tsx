"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { TrackingLink } from "@/components/TrackingLink";
import { CLASS_CODE_LABELS } from "@/lib/constants";
import { buildLeafHref, cn } from "@/lib/utils";
import type { LeafPageSummary } from "@/types";

type CityLeafChooserProps = {
  leafPages: LeafPageSummary[];
};

type GradeFilter = "all" | string;

export function CityLeafChooser({ leafPages }: CityLeafChooserProps) {
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const gradeOptions = useMemo(
    () => [...new Set(leafPages.map((page) => String(page.grade_level)))].sort((a, b) => Number(a) - Number(b)),
    [leafPages],
  );

  const visibleLeafPages = useMemo(() => {
    return [...leafPages]
      .filter((page) => {
        if (gradeFilter !== "all" && String(page.grade_level) !== gradeFilter) {
          return false;
        }

        if (!deferredQuery) {
          return true;
        }

        const classLabel = CLASS_CODE_LABELS[page.class_code] ?? page.class_code;
        return [
          `grade ${page.grade_level}`,
          String(page.grade_level),
          page.class_code,
          classLabel,
        ].some((value) => value.toLowerCase().includes(deferredQuery));
      })
      .sort((left, right) => right.count - left.count || left.grade_level - right.grade_level || left.class_code.localeCompare(right.class_code));
  }, [deferredQuery, gradeFilter, leafPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-md">
          <Input
            aria-label="Search direct shortlist paths on this city page"
            placeholder="Search by grade number or class code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setGradeFilter("all")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              gradeFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-foreground hover:bg-secondary",
            )}
          >
            All grades
          </button>
          {gradeOptions.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setGradeFilter(grade)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                gradeFilter === grade
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-secondary",
              )}
            >
              Grade {grade}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{visibleLeafPages.length} direct shortlist paths match the current view.</span>
        {gradeFilter !== "all" ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            Grade {gradeFilter}
          </span>
        ) : null}
        {deferredQuery ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            Search: {query}
          </span>
        ) : null}
      </div>

      {visibleLeafPages.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleLeafPages.map((page) => {
            const classLabel = CLASS_CODE_LABELS[page.class_code] ?? page.class_code;

            return (
              <TrackingLink
                key={`${page.grade_level}-${page.class_code}`}
                href={buildLeafHref(page.province, page.city, page.grade_level, page.class_code)}
                eventName="leaf_click"
                className="rounded-[1.6rem] border border-border bg-white px-4 py-4 transition-colors hover:border-primary"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                        Grade {page.grade_level}
                      </span>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {page.class_code}
                      </span>
                    </div>
                    <p className="font-serif text-xl font-semibold">{classLabel}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Open the Grade {page.grade_level} {page.class_code} shortlist directly.
                    </p>
                  </div>

                  <div className="grid min-w-[8rem] gap-2 rounded-2xl bg-muted/45 px-3 py-3 text-center sm:min-w-[9rem] sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Contractors
                      </p>
                      <p className="mt-1 text-base font-semibold">{page.count}</p>
                    </div>
                  </div>
                </div>
              </TrackingLink>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center">
          <h3 className="font-serif text-2xl font-semibold">No shortlist paths match this filter</h3>
          <p className="mt-3 text-muted-foreground">
            Try switching back to all grades or removing the search term to reopen the full direct routing set.
          </p>
        </div>
      )}
    </div>
  );
}
