import { loadLocalEnv } from "./load-local-env";
import { importMonitoringGscFile, runMonitoringCommand } from "@/pipeline/monitoring";

function getFilePath(): string {
  const fileFlagIndex = process.argv.findIndex((argument) => argument === "--file");
  const filePath = fileFlagIndex >= 0 ? process.argv[fileFlagIndex + 1] : null;

  if (!filePath) {
    throw new Error("Pass --file <path-to-json>.");
  }

  return filePath;
}

async function main() {
  await loadLocalEnv();

  const filePath = getFilePath();
  const result = await runMonitoringCommand((pool) => importMonitoringGscFile(pool, filePath));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to import monitoring GSC data.");
  console.error(error);
  process.exit(1);
});
