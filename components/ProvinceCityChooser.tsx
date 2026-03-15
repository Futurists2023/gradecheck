"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { buildCityHref } from "@/lib/utils";
import type { CitySummary } from "@/types";

type ProvinceCityChooserProps = {
  cities: CitySummary[];
  province: string;
};

export function ProvinceCityChooser({ cities, province }: ProvinceCityChooserProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleCities = useMemo(() => {
    return [...cities]
      .filter((city) => {
        if (!deferredQuery) {
          return true;
        }

        return city.city.toLowerCase().includes(deferredQuery);
      })
      .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city));
  }, [cities, deferredQuery]);

  return (
    <div className="space-y-6">
      <div className="w-full max-w-md">
        <Input
          aria-label="Search cities in this province"
          placeholder="Search by city name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{visibleCities.length} cities match the current view.</span>
        {deferredQuery ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            Search: {query}
          </span>
        ) : null}
      </div>

      {visibleCities.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleCities.map((city) => (
            <Link
              key={city.city}
              href={buildCityHref(province, city.city)}
              className="rounded-[1.6rem] border border-border bg-white px-4 py-4 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-serif text-xl font-semibold">{city.city}</p>
                  <p className="text-sm text-muted-foreground">
                    Open the city hub to go straight to shortlist routes or browse grade paths.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/45 px-3 py-3 text-center sm:text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Contractors
                  </p>
                  <p className="mt-1 text-base font-semibold">{city.count}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white/80 p-10 text-center">
          <h3 className="font-serif text-2xl font-semibold">No cities match this search</h3>
          <p className="mt-3 text-muted-foreground">
            Remove the search term to reopen the full set of city browsing options.
          </p>
        </div>
      )}
    </div>
  );
}
