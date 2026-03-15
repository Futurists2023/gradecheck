import fs from "node:fs/promises";
import path from "node:path";

export const GOOGLE_GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8787/oauth2callback";
const DEFAULT_CLIENT_SECRET_FILENAME =
  "client_secret_339570659511-8p7kq4rvp74hqh8pfuarlkmikuu6tjd6.apps.googleusercontent.com.json";
const DEFAULT_TOKEN_FILENAME = "gsc-token.json";

type WebClientSecretFile = {
  web: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    redirect_uris?: string[];
    javascript_origins?: string[];
  };
};

export type SavedGoogleToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  created_at?: number;
};

export async function loadGoogleWebClientSecret(): Promise<{
  clientId: string;
  clientSecret: string;
  authUri: string;
  tokenUri: string;
  redirectUri: string;
  configuredRedirectUris: string[];
}> {
  const secretPath =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET_PATH?.trim() || (await resolveDefaultGooglePath(DEFAULT_CLIENT_SECRET_FILENAME));
  const raw = await fs.readFile(secretPath, "utf8");
  const parsed = JSON.parse(raw) as WebClientSecretFile;

  if (!parsed.web?.client_id || !parsed.web?.client_secret) {
    throw new Error(`Invalid Google OAuth client secret file: ${secretPath}`);
  }

  return {
    clientId: parsed.web.client_id,
    clientSecret: parsed.web.client_secret,
    authUri: parsed.web.auth_uri,
    tokenUri: parsed.web.token_uri,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI,
    configuredRedirectUris: parsed.web.redirect_uris ?? [],
  };
}

export function getGoogleTokenPath(options?: {
  envVarName?: string;
  defaultFilename?: string;
}): string {
  const envVarName = options?.envVarName ?? "GOOGLE_OAUTH_TOKEN_PATH";
  const defaultFilename = options?.defaultFilename ?? DEFAULT_TOKEN_FILENAME;

  return process.env[envVarName]?.trim() || path.resolve(process.cwd(), "google-auth", defaultFilename);
}

export async function readGoogleToken(options?: {
  envVarName?: string;
  defaultFilename?: string;
}): Promise<SavedGoogleToken | null> {
  try {
    const raw = await fs.readFile(getGoogleTokenPath(options), "utf8");
    return JSON.parse(raw) as SavedGoogleToken;
  } catch {
    return null;
  }
}

export async function saveGoogleToken(
  token: SavedGoogleToken,
  options?: {
    envVarName?: string;
    defaultFilename?: string;
  },
): Promise<string> {
  const tokenPath = getGoogleTokenPath(options);
  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), "utf8");
  return tokenPath;
}

export function buildGoogleAuthUrl(input: {
  clientId: string;
  authUri: string;
  redirectUri: string;
  state: string;
  scope: string;
}) {
  const url = new URL(input.authUri);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeGoogleAuthCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  tokenUri: string;
  redirectUri: string;
}): Promise<SavedGoogleToken> {
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
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }

  const token = (await response.json()) as SavedGoogleToken;
  return {
    ...token,
    created_at: Date.now(),
  };
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tokenUri: string;
}): Promise<SavedGoogleToken> {
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
    throw new Error(`Google token refresh failed: ${await response.text()}`);
  }

  const token = (await response.json()) as SavedGoogleToken;
  return {
    ...token,
    refresh_token: input.refreshToken,
    created_at: Date.now(),
  };
}

export function getConfiguredGscSiteUrl(): string {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("Set GSC_SITE_URL to your Search Console property, for example sc-domain:gradecheck.co.za.");
  }

  return siteUrl;
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
      // Try the next location.
    }
  }

  return candidates[0];
}
