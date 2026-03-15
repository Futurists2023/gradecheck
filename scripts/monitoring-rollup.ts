import { loadLocalEnv } from "./load-local-env";
import { rollupMonitoringData, runMonitoringCommand } from "@/pipeline/monitoring";

async function main() {
  await loadLocalEnv();

  const result = await runMonitoringCommand(rollupMonitoringData);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to roll up monitoring data.");
  console.error(error);
  process.exit(1);
});
