"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { ContractorCard } from "@/components/ContractorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contractor } from "@/types";

async function runSearch(query: string): Promise<Contractor[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<Contractor[]>;
}

export function VerifySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contractor[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const next = await runSearch(query);
      setResults(next);
      setSearched(true);
    });
  };

  return (
    <div className="space-y-8">
      <form className="surface p-6" onSubmit={onSubmit}>
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter CRS number or contractor name"
            aria-label="Enter CRS number or contractor name"
          />
          <Button type="submit" disabled={query.trim().length < 2 || isPending}>
            <Search className="mr-2 h-4 w-4" />
            {isPending ? "Checking..." : "Search"}
          </Button>
        </div>
      </form>

      {searched ? (
        results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((contractor) => (
              <ContractorCard contractor={contractor} key={contractor.crs_number} />
            ))}
          </div>
        ) : (
          <div className="surface p-8">
            <p className="text-lg font-semibold">No contractor found.</p>
            <p className="mt-2 text-muted-foreground">
              Verify directly on the{" "}
              <Link href="https://www.cidb.org.za/" className="font-medium text-primary hover:underline">
                CIDB portal
              </Link>
              .
            </p>
          </div>
        )
      ) : null}

      <div className="surface p-6">
        <p className="text-lg font-semibold">Need a full report?</p>
        <p className="mt-2 text-muted-foreground">
          Sign up {"->"} paid verification workflows will land here in a future release.
        </p>
      </div>
    </div>
  );
}
