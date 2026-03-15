import fs from "node:fs/promises";
import path from "node:path";

import { loadLocalEnv } from "./load-local-env";
import { applyMonitoringApprovals, runMonitoringCommand } from "@/pipeline/monitoring";

async function main() {
  await loadLocalEnv();

  const result = await runMonitoringCommand(applyMonitoringApprovals);
  const outputPath = path.resolve(process.cwd(), "generated", "launch-index-manifest.json");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to apply monitoring index actions.");
  console.error(error);
  process.exit(1);
});
