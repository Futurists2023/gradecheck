import http from "node:http";

import { loadLocalEnv } from "./load-local-env";
import {
  buildGoogleAuthUrl,
  exchangeGoogleAuthCode,
  loadGoogleWebClientSecret,
  saveGoogleToken,
} from "./google-gsc-common";
import { GOOGLE_GA4_SCOPE } from "@/lib/google-ga4";

const GA4_TOKEN_OPTIONS = {
  envVarName: "GOOGLE_GA4_OAUTH_TOKEN_PATH",
  defaultFilename: "ga4-token.json",
} as const;

async function main() {
  await loadLocalEnv();

  const client = await loadGoogleWebClientSecret();
  const redirectUrl = new URL(client.redirectUri);
  const state = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  if (
    client.configuredRedirectUris.length > 0 &&
    !client.configuredRedirectUris.includes(client.redirectUri)
  ) {
    console.warn(
      `Warning: ${client.redirectUri} is not listed in the downloaded client_secret.json redirect URIs.`,
    );
  }

  const authUrl = buildGoogleAuthUrl({
    clientId: client.clientId,
    authUri: client.authUri,
    redirectUri: client.redirectUri,
    state,
    scope: GOOGLE_GA4_SCOPE,
  });

  console.log("Open this URL in your browser and complete consent:");
  console.log(authUrl);
  console.log("");
  console.log(`Waiting for OAuth callback on ${client.redirectUri} ...`);

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", client.redirectUri);
        if (requestUrl.pathname !== redirectUrl.pathname) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        const returnedState = requestUrl.searchParams.get("state");
        const code = requestUrl.searchParams.get("code");
        const error = requestUrl.searchParams.get("error");

        if (error) {
          response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          response.end(`OAuth failed: ${error}`);
          server.close();
          reject(new Error(`Google OAuth failed: ${error}`));
          return;
        }

        if (!code || returnedState !== state) {
          response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          response.end("Missing authorization code or invalid state.");
          server.close();
          reject(new Error("Missing authorization code or invalid OAuth state."));
          return;
        }

        const token = await exchangeGoogleAuthCode({
          code,
          clientId: client.clientId,
          clientSecret: client.clientSecret,
          tokenUri: client.tokenUri,
          redirectUri: client.redirectUri,
        });
        const tokenPath = await saveGoogleToken(token, GA4_TOKEN_OPTIONS);

        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end(`Google Analytics token saved to ${tokenPath}`);
        server.close();
        resolve();
      } catch (error) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("Failed to complete OAuth flow.");
        server.close();
        reject(error);
      }
    });

    server.listen(Number(redirectUrl.port || 80), redirectUrl.hostname);
  });
}

main().catch((error) => {
  console.error("Failed to authorize Google Analytics access.");
  console.error(error);
  process.exit(1);
});
