"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

import { ExpiryCountdown } from "@/components/ExpiryCountdown";
import { PEBadge } from "@/components/PEBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { TrackingLink } from "@/components/TrackingLink";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildContractorHref } from "@/lib/utils";
import type { ContractorWithGradings } from "@/types";

type SortKey = "name" | "status";

type ContractorTableClientProps = {
  contractors: ContractorWithGradings[];
};

export function ContractorTableClient({ contractors }: ContractorTableClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);

  const sortedContractors = useMemo(() => {
    const next = [...contractors];
    next.sort((left, right) => {
      const comparison =
        sortKey === "name"
          ? left.contractor_name.localeCompare(right.contractor_name)
          : left.registration_status.localeCompare(right.registration_status);

      return descending ? comparison * -1 : comparison;
    });
    return next;
  }, [contractors, descending, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDescending((current) => !current);
      return;
    }

    setSortKey(key);
    setDescending(false);
  };

  if (contractors.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/70 p-10 text-center text-muted-foreground">
        No contractors found.
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <p className="text-sm text-muted-foreground">{contractors.length} contractors</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleSort("name")}>
            Sort by name{" "}
            {sortKey === "name" && !descending ? (
              <ArrowDownAZ className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpAZ className="ml-2 h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleSort("status")}>
            Sort by status{" "}
            {sortKey === "status" && !descending ? (
              <ArrowDownAZ className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpAZ className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contractor Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Grades Held</TableHead>
            <TableHead>PE</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>City</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContractors.map((contractor) => (
            <TableRow key={contractor.crs_number}>
              <TableCell>
                <TrackingLink
                  href={buildContractorHref(contractor.crs_number, contractor.contractor_name)}
                  eventName="profile_open"
                  className="font-semibold hover:text-primary"
                >
                  {contractor.contractor_name}
                </TrackingLink>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  CRS {contractor.crs_number}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge status={contractor.registration_status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {contractor.gradings.map((grading) => (
                    <span
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      key={grading.id}
                    >
                      G{grading.grade_level} {grading.class_code}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <PEBadge pe_flag={contractor.pe_flag} />
              </TableCell>
              <TableCell>
                <ExpiryCountdown
                  expiry_date={contractor.expiry_date}
                  status={contractor.registration_status}
                />
              </TableCell>
              <TableCell>{contractor.city}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
