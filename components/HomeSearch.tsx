"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

import { ContractorCard } from "@/components/ContractorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contractor } from "@/types";

async function fetchSearchResults(query: string): Promise<Contractor[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<Contractor[]>;
}

type HomeSearchProps = {
  placeholder?: string;
};

export function HomeSearch({
  placeholder = "Search by contractor name or CRS number",
}: HomeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contractor[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const nextResults = await fetchSearchResults(query);
      setResults(nextResults);
      setSearched(true);
    });
  };

  return (
    <div className="space-y-6">
      <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <Button type="submit" disabled={query.trim().length < 2 || isPending}>
          <Search className="mr-2 h-4 w-4" />
          {isPending ? "Searching..." : "Verify"}
        </Button>
      </form>
      {searched ? (
        results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {results.slice(0, 4).map((contractor) => (
              <ContractorCard contractor={contractor} key={contractor.crs_number} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contractor found yet. Try a CRS number or exact business name.
          </p>
        )
      ) : null}
    </div>
  );
}
