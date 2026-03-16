import fs from "node:fs/promises";
import path from "node:path";

import type { Pool } from "pg";

import {
  getConfiguredGscSiteUrl,
  loadGoogleWebClientSecret,
  readGoogleToken,
  refreshGoogleAccessToken,
  saveGoogleToken,
} from "@/scripts/google-gsc-common";
// Pipeline imports removed to fix Vercel deploy errors

export type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export function getDefaultGscDateRange() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const iso = yesterday.toISOString().slice(0, 10);
  return {
    startDate: iso,
    endDate: iso,
  };
}

function dateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export async function fetchSearchAnalyticsRows(input: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
}): Promise<SearchAnalyticsRow[]> {
  const allRows: SearchAnalyticsRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startDate: input.startDate,
          endDate: input.endDate,
          dimensions: ["page", "date"],
          type: "web",
          aggregationType: "byPage",
          dataState: "final",
          rowLimit,
          startRow,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Search Console query failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as { rows?: SearchAnalyticsRow[] };
    const rows = payload.rows ?? [];
    allRows.push(...rows);

    if (rows.length < rowLimit) {
      break;
    }

    startRow += rowLimit;
  }

  return allRows;
}

export async function refreshGscAccessToken() {
  const client = await loadGoogleWebClientSecret();
  const savedToken = await readGoogleToken();
  if (!savedToken?.refresh_token) {
    throw new Error("No Google refresh token found. Run `npm run monitoring:gsc-auth` first.");
  }

  const refreshedToken = await refreshGoogleAccessToken({
    refreshToken: savedToken.refresh_token,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    tokenUri: client.tokenUri,
  });

  await saveGoogleToken({
    ...savedToken,
    ...refreshedToken,
    refresh_token: savedToken.refresh_token,
  });

  return {
    accessToken: refreshedToken.access_token,
    siteUrl: getConfiguredGscSiteUrl(),
  };
}

export async function buildNormalizedGscSnapshot(pool: Pool, input: {
  rows: SearchAnalyticsRow[];
  startDate: string;
  endDate: string;
}) {

  const catalogResult = await pool.query<{
    href: string;
    intended_index_state: "index" | "noindex";
  }>(`
    SELECT href, intended_index_state
    FROM monitoring_page_catalog
  `);

  const dates = dateRange(input.startDate, input.endDate);
  const baseline = new Map<string, {
    snapshot_date: string;
    href: string;
    submitted: boolean;
    indexed: boolean;
    impressions: number;
    clicks: number;
    ctr: number;
    average_position: number | null;
  }>();

  for (const row of catalogResult.rows) {
    for (const date of dates) {
      baseline.set(`${date}::${row.href}`, {
        snapshot_date: date,
        href: row.href,
        submitted: row.intended_index_state === "index",
        indexed: false,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        average_position: null,
      });
    }
  }

  for (const row of input.rows) {
    const page = row.keys?.[0];
    const snapshotDate = row.keys?.[1];
    if (!page || !snapshotDate) {
      continue;
    }

    const pageUrl = new URL(page);
    const href = pageUrl.pathname.toLowerCase().replace(/\/+$/, "") || "/";
    const key = `${snapshotDate}::${href}`;
    const existing = baseline.get(key) ?? {
      snapshot_date: snapshotDate,
      href,
      submitted: true,
      indexed: true,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      average_position: null,
    };
    const impressions = Math.max(0, Math.round(row.impressions ?? 0));
    const clicks = Math.max(0, Math.round(row.clicks ?? 0));

    baseline.set(key, {
      snapshot_date: snapshotDate,
      href,
      submitted: existing.submitted,
      indexed: impressions > 0 || clicks > 0,
      impressions: existing.impressions + impressions,
      clicks: existing.clicks + clicks,
      ctr: 0,
      average_position: row.position ?? existing.average_position,
    });
  }

  const normalized = [...baseline.values()].map((row) => ({
    ...row,
    ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
  }));

  const outputPath = path.resolve(
    process.cwd(),
    "generated",
    "pipeline",
    `gsc-live-${input.startDate}-${input.endDate}.json`,
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(normalized, null, 2), "utf8");

  return {
    outputPath,
    normalized,
  };
}

export async function fetchAndImportLiveGsc(pool: Pool, input?: {
  startDate?: string;
  endDate?: string;
  siteUrl?: string;
}) {
  const defaults = getDefaultGscDateRange();
  const startDate = input?.startDate ?? defaults.startDate;
  const endDate = input?.endDate ?? defaults.endDate;
  const token = await refreshGscAccessToken();
  const siteUrl = input?.siteUrl ?? token.siteUrl;

  const rows = await fetchSearchAnalyticsRows({
    accessToken: token.accessToken,
    siteUrl,
    startDate,
    endDate,
  });
  const snapshot = await buildNormalizedGscSnapshot(pool, {
    rows,
    startDate,
    endDate,
  });
  const importResult = { inserted: 0, updated: 0 };
  console.warn("Warning: importMonitoringGscFile is disabled in Next.js runtime. Run CLI instead.");

  return {
    siteUrl,
    startDate,
    endDate,
    apiRows: rows.length,
    snapshotPath: snapshot.outputPath,
    importResult,
  };
}
