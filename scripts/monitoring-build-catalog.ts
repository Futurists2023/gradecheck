import { loadLocalEnv } from "./load-local-env";
import { buildMonitoringPageCatalog, runMonitoringCommand } from "@/pipeline/monitoring";

async function main() {
  await loadLocalEnv();

  const result = await runMonitoringCommand(buildMonitoringPageCatalog);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to build monitoring page catalog.");
  console.error(error);
  process.exit(1);
});
