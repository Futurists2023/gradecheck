"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

import { trackMonitoringEvent } from "@/components/MonitoringTracker";
import type { MonitoringEventName, MonitoringRouteType } from "@/types/monitoring";

type TrackingLinkProps = PropsWithChildren<
  LinkProps &
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
      eventName: MonitoringEventName;
      trackingHref?: string;
      routeType?: MonitoringRouteType | null;
      metadata?: Record<string, boolean | number | string | null>;
    }
>;

export function TrackingLink({
  children,
  eventName,
  trackingHref,
  routeType,
  metadata,
  onClick,
  href,
  ...props
}: TrackingLinkProps) {
  const resolvedHref = trackingHref ?? (typeof href === "string" ? href : href.toString());

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        void trackMonitoringEvent({
          eventName,
          href: resolvedHref,
          routeType,
          metadata,
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
