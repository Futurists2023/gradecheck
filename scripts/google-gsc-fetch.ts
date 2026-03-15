import { loadLocalEnv } from "./load-local-env";
import { getConfiguredGscSiteUrl } from "./google-gsc-common";
import { fetchAndImportLiveGsc, getDefaultGscDateRange } from "@/lib/google-gsc";
import { runMonitoringCommand } from "@/pipeline/monitoring";

function getArgValue(flag: string): string | null {
  const index = process.argv.findIndex((argument) => argument === flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function getPositionalArgs(): string[] {
  return process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
}

async function main() {
  await loadLocalEnv();

  const defaults = getDefaultGscDateRange();
  const positionalArgs = getPositionalArgs();
  const startDate = getArgValue("--start-date") ?? positionalArgs[0] ?? defaults.startDate;
  const endDate = getArgValue("--end-date") ?? positionalArgs[1] ?? defaults.endDate;
  const siteUrl = getArgValue("--site-url") ?? getConfiguredGscSiteUrl();

  const result = await runMonitoringCommand((pool) =>
    fetchAndImportLiveGsc(pool, {
      startDate,
      endDate,
      siteUrl,
    }),
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to fetch live Google Search Console data.");
  console.error(error);
  process.exit(1);
});
