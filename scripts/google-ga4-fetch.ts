import { loadLocalEnv } from "./load-local-env";
import { fetchAndImportLiveGa4, getDefaultGa4DateRange } from "@/lib/google-ga4";
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

  const defaults = getDefaultGa4DateRange();
  const positionalArgs = getPositionalArgs();
  const startDate = getArgValue("--start-date") ?? positionalArgs[0] ?? defaults.startDate;
  const endDate = getArgValue("--end-date") ?? positionalArgs[1] ?? defaults.endDate;
  const propertyId = getArgValue("--property-id");
  const measurementId = getArgValue("--measurement-id");

  const result = await runMonitoringCommand((pool) =>
    fetchAndImportLiveGa4(pool, {
      startDate,
      endDate,
      propertyId,
      measurementId,
    }),
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to fetch live Google Analytics data.");
  console.error(error);
  process.exit(1);
});
