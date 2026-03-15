import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { buildVerifyHref } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="container-shell">
      <div className="surface flex flex-col items-start gap-6 p-10 md:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="font-serif text-4xl font-semibold">This page is not in the registry.</h1>
        <p className="max-w-2xl text-muted-foreground">
          The route may be outdated, non-canonical, or not part of the current CIDB sample
          dataset.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants()}>
            Back home
          </Link>
          <Link href={buildVerifyHref()} className={buttonVariants({ variant: "outline" })}>
            Open verify tool
          </Link>
        </div>
      </div>
    </div>
  );
}
