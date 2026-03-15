import fs from "node:fs/promises";
import path from "node:path";

import type { Pool } from "pg";

import { normalizeMonitoringHref } from "@/lib/monitoring";
import { buildMonitoringPageCatalog, importMonitoringGa4File } from "@/pipeline/monitoring";
import {
  loadGoogleWebClientSecret,
  readGoogleToken,
  refreshGoogleAccessToken,
  saveGoogleToken,
} from "@/scripts/google-gsc-common";

const GA4_TOKEN_OPTIONS = {
  envVarName: "GOOGLE_GA4_OAUTH_TOKEN_PATH",
  defaultFilename: "ga4-token.json",
} as const;

export const GOOGLE_GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

type Ga4AccountSummaryResponse = {
  accountSummaries?: Array<{
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
  nextPageToken?: string;
};

type Ga4DataStreamsResponse = {
  dataStreams?: Array<{
    name?: string;
    type?: string;
    displayName?: string;
    webStreamData?: {
      measurementId?: string;
      defaultUri?: string;
    };
  }>;
  nextPageToken?: string;
};

type Ga4RunReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type Ga4RunReportResponse = {
  rows?: Ga4RunReportRow[];
  rowCount?: number;
};

export function getDefaultGa4DateRange() {
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

function normalizePropertyId(propertyId: string): string {
  return propertyId.replace(/^properties\//, "").trim();
}

function formatGa4Date(rawDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  if (/^\d{8}$/.test(rawDate)) {
    return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  }

  throw new Error(`Unexpected GA4 date value: ${rawDate}`);
}

function parseMetricValue(rawValue: string | undefined): number {
  if (!rawValue) {
    return 0;
  }

  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

export function getConfiguredGa4MeasurementId(): string | null {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID?.trim() || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();

  return measurementId || null;
}

export function getConfiguredGa4PropertyId(): string | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  return propertyId ? normalizePropertyId(propertyId) : null;
}

export async function getGa4SyncReadiness(): Promise<{
  enabled: boolean;
  reason?: string;
}> {
  const propertyId = getConfiguredGa4PropertyId();
  const measurementId = getConfiguredGa4MeasurementId();

  if (!propertyId && !measurementId) {
    return {
      enabled: false,
      reason: "Set GA4_PROPERTY_ID or GA4_MEASUREMENT_ID before enabling live GA4 sync.",
    };
  }

  const token = await readGoogleToken(GA4_TOKEN_OPTIONS);
  if (!token?.refresh_token) {
    return {
      enabled: false,
      reason: "Run `npm run monitoring:ga4-auth` to authorize GA4 API access.",
    };
  }

  return {
    enabled: true,
  };
}

export async function refreshGa4AccessToken() {
  const client = await loadGoogleWebClientSecret();
  const savedToken = await readGoogleToken(GA4_TOKEN_OPTIONS);
  if (!savedToken?.refresh_token) {
    throw new Error("No GA4 refresh token found. Run `npm run monitoring:ga4-auth` first.");
  }

  const refreshedToken = await refreshGoogleAccessToken({
    refreshToken: savedToken.refresh_token,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    tokenUri: client.tokenUri,
  });

  await saveGoogleToken(
    {
      ...savedToken,
      ...refreshedToken,
      refresh_token: savedToken.refresh_token,
    },
    GA4_TOKEN_OPTIONS,
  );

  return {
    accessToken: refreshedToken.access_token,
  };
}

async function fetchGa4AccountSummaries(accessToken: string) {
  const summaries: NonNullable<Ga4AccountSummaryResponse["accountSummaries"]> = [];
  let pageToken: string | null = null;

  while (true) {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GA4 account summary query failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as Ga4AccountSummaryResponse;
    summaries.push(...(payload.accountSummaries ?? []));

    if (!payload.nextPageToken) {
      break;
    }

    pageToken = payload.nextPageToken;
  }

  return summaries;
}

async function fetchGa4DataStreams(input: {
  accessToken: string;
  propertyId: string;
}) {
  const streams: NonNullable<Ga4DataStreamsResponse["dataStreams"]> = [];
  let pageToken: string | null = null;

  while (true) {
    const url = new URL(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${input.propertyId}/dataStreams`,
    );
    url.searchParams.set("pageSize", "200");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GA4 data stream query failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as Ga4DataStreamsResponse;
    streams.push(...(payload.dataStreams ?? []));

    if (!payload.nextPageToken) {
      break;
    }

    pageToken = payload.nextPageToken;
  }

  return streams;
}

export async function resolveGa4PropertyId(input: {
  accessToken: string;
  propertyId?: string | null;
  measurementId?: string | null;
}) {
  if (input.propertyId) {
    return normalizePropertyId(input.propertyId);
  }

  if (!input.measurementId) {
    throw new Error("Set GA4_PROPERTY_ID or GA4_MEASUREMENT_ID before fetching live GA4 data.");
  }

  const summaries = await fetchGa4AccountSummaries(input.accessToken);

  for (const summary of summaries) {
    for (const propertySummary of summary.propertySummaries ?? []) {
      const propertyId = propertySummary.property ? normalizePropertyId(propertySummary.property) : null;
      if (!propertyId) {
        continue;
      }

      const streams = await fetchGa4DataStreams({
        accessToken: input.accessToken,
        propertyId,
      });
      const matchingStream = streams.find(
        (stream) => stream.webStreamData?.measurementId?.trim() === input.measurementId,
      );

      if (matchingStream) {
        return propertyId;
      }
    }
  }

  throw new Error(
    `Could not resolve a GA4 property for measurement ID ${input.measurementId}. Set GA4_PROPERTY_ID explicitly if needed.`,
  );
}

export async function fetchGa4LandingPageRows(input: {
  accessToken: string;
  propertyId: string;
  startDate: string;
  endDate: string;
}) {
  const rows: Ga4RunReportRow[] = [];
  const limit = 100_000;
  let offset = 0;

  while (true) {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${input.propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: input.startDate,
              endDate: input.endDate,
            },
          ],
          dimensions: [{ name: "date" }, { name: "pagePath" }],
          metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "screenPageViews" }],
          keepEmptyRows: false,
          limit: String(limit),
          offset: String(offset),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`GA4 runReport query failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as Ga4RunReportResponse;
    const nextRows = payload.rows ?? [];
    rows.push(...nextRows);

    if (nextRows.length < limit || rows.length >= (payload.rowCount ?? 0)) {
      break;
    }

    offset += limit;
  }

  return rows;
}

export async function buildNormalizedGa4Snapshot(pool: Pool, input: {
  rows: Ga4RunReportRow[];
  startDate: string;
  endDate: string;
}) {
  await buildMonitoringPageCatalog(pool);

  const catalogResult = await pool.query<{ href: string }>(`
    SELECT href
    FROM monitoring_page_catalog
  `);

  const dates = dateRange(input.startDate, input.endDate);
  const baseline = new Map<string, {
    snapshot_date: string;
    href: string;
    sessions: number;
    engaged_sessions: number;
    views: number;
  }>();

  for (const row of catalogResult.rows) {
    for (const date of dates) {
      baseline.set(`${date}::${row.href}`, {
        snapshot_date: date,
        href: row.href,
        sessions: 0,
        engaged_sessions: 0,
        views: 0,
      });
    }
  }

  for (const row of input.rows) {
    const rawDate = row.dimensionValues?.[0]?.value;
    const rawPath = row.dimensionValues?.[1]?.value;
    if (!rawDate || !rawPath) {
      continue;
    }

    const snapshotDate = formatGa4Date(rawDate);
    const href = normalizeMonitoringHref(rawPath);
    if (!href) {
      continue;
    }

    const key = `${snapshotDate}::${href}`;
    const existing = baseline.get(key) ?? {
      snapshot_date: snapshotDate,
      href,
      sessions: 0,
      engaged_sessions: 0,
      views: 0,
    };

    baseline.set(key, {
      snapshot_date: snapshotDate,
      href,
      sessions: existing.sessions + parseMetricValue(row.metricValues?.[0]?.value),
      engaged_sessions: existing.engaged_sessions + parseMetricValue(row.metricValues?.[1]?.value),
      views: existing.views + parseMetricValue(row.metricValues?.[2]?.value),
    });
  }

  const normalized = [...baseline.values()];
  const outputPath = path.resolve(
    process.cwd(),
    "generated",
    "pipeline",
    `ga4-live-${input.startDate}-${input.endDate}.json`,
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(normalized, null, 2), "utf8");

  return {
    outputPath,
    normalized,
  };
}

export async function fetchAndImportLiveGa4(pool: Pool, input?: {
  startDate?: string;
  endDate?: string;
  propertyId?: string | null;
  measurementId?: string | null;
}) {
  const defaults = getDefaultGa4DateRange();
  const startDate = input?.startDate ?? defaults.startDate;
  const endDate = input?.endDate ?? defaults.endDate;
  const measurementId = input?.measurementId ?? getConfiguredGa4MeasurementId();
  const token = await refreshGa4AccessToken();
  const propertyId = await resolveGa4PropertyId({
    accessToken: token.accessToken,
    propertyId: input?.propertyId ?? getConfiguredGa4PropertyId(),
    measurementId,
  });

  const rows = await fetchGa4LandingPageRows({
    accessToken: token.accessToken,
    propertyId,
    startDate,
    endDate,
  });
  const snapshot = await buildNormalizedGa4Snapshot(pool, {
    rows,
    startDate,
    endDate,
  });
  const importResult = await importMonitoringGa4File(pool, snapshot.outputPath);

  return {
    propertyId,
    measurementId,
    startDate,
    endDate,
    apiRows: rows.length,
    snapshotPath: snapshot.outputPath,
    importResult,
  };
}
