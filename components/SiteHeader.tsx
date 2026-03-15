import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  buildAboutHref,
  buildClassCodesHubHref,
  buildGradesHubHref,
  buildVerifyHref,
} from "@/lib/utils";

const navItems = [
  { href: buildVerifyHref(), label: "Verify" },
  { href: buildGradesHubHref(), label: "Grades" },
  { href: buildClassCodesHubHref(), label: "Class Codes" },
  { href: buildAboutHref(), label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-background/90 backdrop-blur">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="text-xl font-black uppercase tracking-[0.3em] text-foreground">
          GradeCheck
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href={buildVerifyHref()} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Verify Contractor
        </Link>
      </div>
    </header>
  );
}
