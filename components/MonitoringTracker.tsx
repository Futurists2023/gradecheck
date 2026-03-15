"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { detectMonitoringRouteType } from "@/lib/monitoring";
import type { MonitoringEventName, MonitoringRouteType } from "@/types/monitoring";

type MonitoringPayload = {
  eventName: MonitoringEventName;
  href: string;
  routeType?: MonitoringRouteType | null;
  referrerHref?: string | null;
  metadata?: Record<string, boolean | number | string | null>;
};

const SESSION_STORAGE_KEY = "gradecheck_monitoring_session_id";

function getSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

export async function trackMonitoringEvent(payload: MonitoringPayload): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    eventName: payload.eventName,
    href: payload.href,
    routeType: payload.routeType ?? detectMonitoringRouteType(payload.href),
    referrerHref: payload.referrerHref ?? window.location.pathname,
    sessionId: getSessionId(),
    occurredAt: new Date().toISOString(),
    metadata: payload.metadata ?? {},
  });

  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(
      "/api/monitoring/events",
      new Blob([body], { type: "application/json" }),
    );
    if (ok) {
      return;
    }
  }

  await fetch("/api/monitoring/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function MonitoringTracker() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    void trackMonitoringEvent({
      eventName: "page_view_start",
      href: pathname,
      referrerHref: previousPath,
    });

    const handlePageHide = () => {
      void trackMonitoringEvent({
        eventName: "page_view_end",
        href: pathname,
        referrerHref: previousPathRef.current,
      });
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      void trackMonitoringEvent({
        eventName: "page_view_end",
        href: pathname,
        referrerHref: previousPathRef.current,
      });
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [pathname]);

  return null;
}
