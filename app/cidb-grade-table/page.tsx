import type { Metadata } from "next";

import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { ALL_GRADES, GRADE_THRESHOLDS } from "@/lib/constants";
import { absoluteUrl, buildGradeTableHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CIDB grade table",
  description: "Reference table for CIDB grade numbers and their tender value thresholds.",
  alternates: {
    canonical: absoluteUrl(buildGradeTableHref()),
  },
  robots: NOINDEX_FOLLOW_ROBOTS,
};

export default function GradeTablePage() {
  return (
    <div className="container-shell space-y-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "CIDB Grade Table", href: buildGradeTableHref() },
        ]}
      />
      <section className="surface p-8">
        <h1 className="font-serif text-4xl font-semibold">CIDB grade table</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Use this table as a quick reference for CIDB tender value limits across Grades 1 to 9.
        </p>
      </section>
      <section className="surface p-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Tender value threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_GRADES.map((grade) => (
              <TableRow key={grade}>
                <TableCell>Grade {grade}</TableCell>
                <TableCell>{GRADE_THRESHOLDS[grade]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
