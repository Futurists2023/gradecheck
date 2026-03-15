"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const AccordionContext = React.createContext<{
  value: string | null;
  setValue: (value: string | null) => void;
  collapsible: boolean;
} | null>(null);

function Accordion({
  children,
  defaultValue,
  collapsible = false,
  className,
}: {
  children: React.ReactNode;
  type?: "single";
  defaultValue?: string;
  collapsible?: boolean;
  className?: string;
}) {
  const [value, setValue] = React.useState<string | null>(defaultValue ?? null);

  return (
    <AccordionContext.Provider value={{ value, setValue, collapsible }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

const AccordionItemContext = React.createContext<{ value: string } | null>(null);

function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("border-b", className)}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!context || !item) {
    return <button className={className} type="button">{children}</button>;
  }

  const open = context.value === item.value;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between py-5 text-left font-semibold transition-all hover:text-primary",
        className,
      )}
      onClick={() => context.setValue(open && context.collapsible ? null : item.value)}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open ? "rotate-180" : "")} />
    </button>
  );
}

function AccordionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!context || !item || context.value !== item.value) {
    return null;
  }

  return <div className={cn("pb-5 pt-1 text-sm text-muted-foreground", className)}>{children}</div>;
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
