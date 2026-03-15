"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const TooltipProvider = ({ children }: { children: React.ReactNode; delayDuration?: number }) => (
  <>{children}</>
);

const TooltipContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(
  null,
);

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return <TooltipContext.Provider value={{ open, setOpen }}>{children}</TooltipContext.Provider>;
}

function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const context = React.useContext(TooltipContext);
  if (!context) {
    return <>{children}</>;
  }

  const triggerProps = {
    onMouseEnter: () => context.setOpen(true),
    onMouseLeave: () => context.setOpen(false),
    onFocus: () => context.setOpen(true),
    onBlur: () => context.setOpen(false),
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, triggerProps);
  }

  return <span {...triggerProps}>{children}</span>;
}

function TooltipContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
  sideOffset?: number;
}) {
  const context = React.useContext(TooltipContext);
  if (!context?.open) {
    return null;
  }

  return (
    <span
      role="tooltip"
      className={cn(
        "absolute left-1/2 top-full z-50 mt-2 w-max max-w-xs -translate-x-1/2 rounded-2xl bg-foreground px-4 py-3 text-sm text-white shadow-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
