"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { CLASS_CODE_LABELS } from "@/lib/constants";
import { buildCityGradeHref, cn } from "@/lib/utils";
import type { CityGradeChooserRow } from "@/types";

type CityGradeChooserProps = {
  city: string;
  grades: CityGradeChooserRow[];
  province: string;
};

type ChooserFilter = "all" | "public" | "pe";

const FILTER_LABELS: Record<ChooserFilter, string> = {
  all: "All grades",
  public: "Public shortlist paths",
  pe: "PE available",
};

export function CityGradeChooser({ city, grades, province }: CityGradeChooserProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChooserFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const strongestPublicLeafCount = Math.max(...grades.map((grade) => grade.public_leaf_count), 0);

  const visibleGrades = useMemo(() => {
    return grades.filter((grade) => {
      if (filter === "public" && grade.public_leaf_count === 0) {
        return false;
      }

      if (filter === "pe" && grade.pe_count === 0) {
        return false;
      }

      if (!deferredQuery) {
        return true;
      }

      const haystack = [
        `grade ${grade.grade_level}`,
        String(grade.grade_level),
        ...grade.classes,
        ...grade.classes.map((classCode) => CLASS_CODE_LABELS[classCode] ?? classCode),
      ];

      return haystack.some((value) => value.toLowerCase().includes(deferredQuery));
    });
  }, [deferredQuery, filter, grades]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-md">
          <Input
            aria-label="Search grade paths on this city page"
            placeholder="Search by grade number or class code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(["all", "public", "pe"] as ChooserFilter[]).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setFilter(filterKey)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                filter === filterKey
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-secondary",
              )}
            >
              {FILTER_LABELS[filterKey]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{visibleGrades.length} grade paths match the current view.</span>
        {filter !== "all" ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            {FILTER_LABELS[filter]}
          </span>
        ) : null}
        {deferredQuery ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            Search: {query}
          </span>
        ) : null}
      </div>

      {visibleGrades.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleGrades.map((grade) => {
            const isStrongestPublicGrade =
              strongestPublicLeafCount > 0 && grade.public_leaf_count === strongestPublicLeafCount;

            return (
              <Link
                key={grade.grade_level}
                href={buildCityGradeHref(province, city, grade.grade_level)}
                className={cn(
                  "rounded-[1.7rem] border px-4 py-4 transition-colors",
                  isStrongestPublicGrade
                    ? "border-primary/30 bg-primary/5 hover:border-primary"
                    : "border-border bg-white hover:border-primary",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                        Grade {grade.grade_level}
                      </span>
                      {grade.public_leaf_count > 0 ? (
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          {grade.public_leaf_count} public shortlist
                          {grade.public_leaf_count === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {grade.pe_count > 0 ? (
                        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          PE available
                        </span>
                      ) : null}
                    </div>
                    <p className="font-serif text-xl font-semibold">
                      Open Grade {grade.grade_level} routes
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Classes: {grade.classes.join(", ")}.
                    </p>
                  </div>

                  <div className="grid min-w-[10rem] grid-cols-3 gap-3 rounded-2xl bg-muted/45 px-3 py-3 text-center sm:min-w-[11rem] sm:grid-cols-1 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Contractors
                      </p>
                      <p className="mt-1 text-base font-semibold">{grade.contractor_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Active
                      </p>
                      <p className="mt-1 text-base font-semibold">{grade.active_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Classes
                      </p>
                      <p className="mt-1 text-base font-semibold">{grade.classes.length}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center">
          <h3 className="font-serif text-2xl font-semibold">No grade paths match this filter</h3>
          <p className="mt-3 text-muted-foreground">
            Try switching back to all grades or removing the search term to reopen the full routing set.
          </p>
        </div>
      )}
    </div>
  );
}
