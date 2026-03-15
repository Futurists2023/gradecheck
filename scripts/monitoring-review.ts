import { loadLocalEnv } from "./load-local-env";
import { reviewMonitoringClusters, runMonitoringCommand } from "@/pipeline/monitoring";

async function main() {
  await loadLocalEnv();

  const result = await runMonitoringCommand(reviewMonitoringClusters);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to compute monitoring reviews.");
  console.error(error);
  process.exit(1);
});
