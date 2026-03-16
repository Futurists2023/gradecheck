import Image from "next/image";
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
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/logo-icon.png"
            alt="GradeCheck Logo"
            width={40}
            height={40}
            className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-slate-100">Grade</span>
            <span className="text-primary">Check</span>
          </span>
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
