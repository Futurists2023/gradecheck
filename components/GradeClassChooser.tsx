"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { CLASS_CODE_LABELS } from "@/lib/constants";
import { buildClassCodeHref, buildLeafHref, cn } from "@/lib/utils";
import type { CityGradeClassPath } from "@/types";

type GradeClassChooserProps = {
  city: string;
  classPaths: CityGradeClassPath[];
  gradeLevel: number;
  province: string;
};

type ChooserFilter = "all" | "public" | "guide" | "pe";

const FILTER_LABELS: Record<ChooserFilter, string> = {
  all: "All classes",
  public: "Public shortlist",
  guide: "Guide only",
  pe: "PE available",
};

export function GradeClassChooser({
  city,
  classPaths,
  gradeLevel,
  province,
}: GradeClassChooserProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChooserFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visiblePaths = useMemo(() => {
    return classPaths.filter((path) => {
      if (filter === "public" && !path.has_public_leaf) {
        return false;
      }

      if (filter === "guide" && path.has_public_leaf) {
        return false;
      }

      if (filter === "pe" && path.pe_count === 0) {
        return false;
      }

      if (!deferredQuery) {
        return true;
      }

      const classLabel = CLASS_CODE_LABELS[path.class_code] ?? path.class_code;
      return [path.class_code, classLabel].some((value) =>
        value.toLowerCase().includes(deferredQuery),
      );
    });
  }, [classPaths, deferredQuery, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-md">
          <Input
            aria-label="Search class paths on this grade page"
            placeholder="Search by class code or work class"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(["all", "public", "guide", "pe"] as ChooserFilter[]).map((filterKey) => (
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
        <span>{visiblePaths.length} class paths match the current view.</span>
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

      {visiblePaths.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visiblePaths.map((path) => {
            const classLabel = CLASS_CODE_LABELS[path.class_code] ?? path.class_code;
            const destination = path.has_public_leaf
              ? buildLeafHref(province, city, gradeLevel, path.class_code)
              : buildClassCodeHref(path.class_code);

            return (
              <Link
                key={path.class_code}
                href={destination}
                className={cn(
                  "rounded-[1.6rem] border px-4 py-4 transition-colors",
                  path.has_public_leaf
                    ? "border-border bg-white hover:border-primary"
                    : "border-border/70 bg-muted/45 hover:border-border",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                        {path.class_code}
                      </span>
                      {!path.has_public_leaf ? (
                        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Guide only
                        </span>
                      ) : null}
                      {path.pe_count > 0 ? (
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          PE present
                        </span>
                      ) : null}
                    </div>
                    <p className="font-serif text-xl font-semibold">{classLabel}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {path.has_public_leaf
                        ? `Open the Grade ${gradeLevel} ${path.class_code} shortlist for ${city}.`
                        : `Review the ${path.class_code} class guide while this city-grade path remains below the public shortlist threshold.`}
                    </p>
                  </div>

                  <div className="grid min-w-[10rem] grid-cols-3 gap-3 rounded-2xl bg-muted/45 px-3 py-3 text-center sm:min-w-[11rem] sm:grid-cols-1 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Contractors
                      </p>
                      <p className="mt-1 text-base font-semibold">{path.contractor_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Active
                      </p>
                      <p className="mt-1 text-base font-semibold">{path.active_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        PE
                      </p>
                      <p className="mt-1 text-base font-semibold">{path.pe_count}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center">
          <h3 className="font-serif text-2xl font-semibold">No class paths match this filter</h3>
          <p className="mt-3 text-muted-foreground">
            Try switching back to all classes or removing the search term to reopen the full set of routing options.
          </p>
        </div>
      )}
    </div>
  );
}
