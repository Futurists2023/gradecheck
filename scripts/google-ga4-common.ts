import fs from "node:fs/promises";
import path from "node:path";

export const GOOGLE_GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8788/oauth2callback";
const DEFAULT_CLIENT_SECRET_FILENAME =
  "client_secret_339570659511-8p7kq4rvp74hqh8pfuarlkmikuu6tjd6.apps.googleusercontent.com.json";
const DEFAULT_TOKEN_FILENAME = "ga4-token.json";

type WebClientSecretFile = {
  web: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    redirect_uris?: string[];
  };
};

export type SavedGoogleAnalyticsToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  created_at?: number;
};

export async function loadGoogleAnalyticsWebClientSecret(): Promise<{
  clientId: string;
  clientSecret: string;
  authUri: string;
  tokenUri: string;
  redirectUri: string;
  configuredRedirectUris: string[];
}> {
  const secretPath =
    process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_SECRET_PATH?.trim() ||
    (await resolveDefaultGooglePath(DEFAULT_CLIENT_SECRET_FILENAME));
  const raw = await fs.readFile(secretPath, "utf8");
  const parsed = JSON.parse(raw) as WebClientSecretFile;

  if (!parsed.web?.client_id || !parsed.web?.client_secret) {
    throw new Error(`Invalid Google Analytics OAuth client secret file: ${secretPath}`);
  }

  return {
    clientId: parsed.web.client_id,
    clientSecret: parsed.web.client_secret,
    authUri: parsed.web.auth_uri,
    tokenUri: parsed.web.token_uri,
    redirectUri: process.env.GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI,
    configuredRedirectUris: parsed.web.redirect_uris ?? [],
  };
}

export function getGoogleAnalyticsTokenPath(): string {
  return (
    process.env.GOOGLE_ANALYTICS_OAUTH_TOKEN_PATH?.trim() ||
    path.resolve(process.cwd(), "google-auth", DEFAULT_TOKEN_FILENAME)
  );
}

export async function readGoogleAnalyticsToken(): Promise<SavedGoogleAnalyticsToken | null> {
  try {
    const raw = await fs.readFile(getGoogleAnalyticsTokenPath(), "utf8");
    return JSON.parse(raw) as SavedGoogleAnalyticsToken;
  } catch {
    return null;
  }
}

export async function saveGoogleAnalyticsToken(token: SavedGoogleAnalyticsToken): Promise<string> {
  const tokenPath = getGoogleAnalyticsTokenPath();
  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), "utf8");
  return tokenPath;
}

export function buildGoogleAnalyticsAuthUrl(input: {
  clientId: string;
  authUri: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(input.authUri);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_GA4_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeGoogleAnalyticsAuthCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  tokenUri: string;
  redirectUri: string;
}): Promise<SavedGoogleAnalyticsToken> {
  const response = await fetch(input.tokenUri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Analytics token exchange failed: ${await response.text()}`);
  }

  const token = (await response.json()) as SavedGoogleAnalyticsToken;
  return {
    ...token,
    created_at: Date.now(),
  };
}

export async function refreshGoogleAnalyticsAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tokenUri: string;
}): Promise<SavedGoogleAnalyticsToken> {
  const response = await fetch(input.tokenUri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Analytics token refresh failed: ${await response.text()}`);
  }

  const token = (await response.json()) as SavedGoogleAnalyticsToken;
  return {
    ...token,
    refresh_token: input.refreshToken,
    created_at: Date.now(),
  };
}

export function getConfiguredGa4PropertyId(): string {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) {
    throw new Error("Set GA4_PROPERTY_ID to your GA4 numeric property id.");
  }

  return propertyId;
}

export async function hasGa4SyncConfig(): Promise<boolean> {
  if (!process.env.GA4_PROPERTY_ID?.trim()) {
    return false;
  }

  try {
    await fs.access(getGoogleAnalyticsTokenPath());
    return true;
  } catch {
    return false;
  }
}

async function resolveDefaultGooglePath(filename: string): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "google-auth", filename),
    path.resolve(process.cwd(), "google auth", filename),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next.
    }
  }

  return candidates[0];
}
