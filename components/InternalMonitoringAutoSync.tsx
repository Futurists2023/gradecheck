"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LAST_SYNC_KEY = "gradecheck_monitoring_last_sync_started_at";
const SYNC_COOLDOWN_MS = 1000 * 60 * 15;

export function InternalMonitoringAutoSync() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const [message, setMessage] = useState("Checking live monitoring freshness...");
  const [isSyncing, setIsSyncing] = useState(false);

  const runSync = async (force: boolean) => {
    setIsSyncing(true);

    try {
      const response = await fetch("/internal/monitoring/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ force }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        status?: "busy" | "up_to_date" | "synced";
        ga4Result?: {
          skipped?: boolean;
          reason?: string;
        };
        error?: string;
      };

      if (!payload.ok) {
        throw new Error(payload.error ?? "Monitoring sync failed.");
      }

      if (payload.status === "busy") {
        setMessage("Another monitoring sync is already running.");
        return;
      }

      if (payload.status === "up_to_date") {
        setMessage("Monitoring dashboard is already up to date.");
        return;
      }

      setMessage(
        payload.ga4Result?.skipped
          ? "Monitoring dashboard refreshed from live GSC data. GA4 sync is still pending setup."
          : "Monitoring dashboard refreshed from live GSC and GA4 data.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Monitoring sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const lastStarted = window.sessionStorage.getItem(LAST_SYNC_KEY);
    if (lastStarted && Date.now() - Number(lastStarted) < SYNC_COOLDOWN_MS) {
      setMessage("Using the latest dashboard sync from this session.");
      return;
    }

    window.sessionStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    void runSync(false);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={() => void runSync(true)}
        disabled={isSyncing}
        className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        {isSyncing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}
