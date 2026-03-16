import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "generated", "launch-index-manifest.json");
const PUBLISHABILITY_PATH = path.join(ROOT, "generated", "pipeline", "publishability-manifest.json");

async function loadLocalEnvIfPresent() {
  try {
    const envPath = path.join(ROOT, ".env.local");
    const raw = await fs.readFile(envPath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing local env file in CI/build environments
  }
}

async function main() {
  await loadLocalEnvIfPresent();

  try {
    const monitoringPath = path.join(ROOT, "generated", "pipeline", "monitoring-index-manifest.json");
    const raw = await fs.readFile(monitoringPath, "utf8");
    const monitoringManifest = JSON.parse(raw);

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(monitoringManifest, null, 2), "utf8");
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    const raw = await fs.readFile(PUBLISHABILITY_PATH, "utf8");
    const publishabilityManifest = JSON.parse(raw);

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(
      OUTPUT_PATH,
      JSON.stringify(
        {
          generatedAt: publishabilityManifest.generatedAt,
          totalBudget: publishabilityManifest.totalBudget,
          contractorBudget: publishabilityManifest.contractorBudget,
          allowed: publishabilityManifest.budgetedAllowedUrls ?? [],
          priorityByPath: Object.fromEntries(
            (publishabilityManifest.allowedCandidates ?? []).map((candidate) => [
              candidate.href,
              candidate.href === "/" ? 1 : 0.7,
            ]),
          ),
        },
        null,
        2,
      ),
      "utf8",
    );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    await fs.access(OUTPUT_PATH);
    console.log(
      "Publishability manifest not found; using committed generated/launch-index-manifest.json for this build.",
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log("No manifests found; generating an empty fallback manifest for build to pass.");
      await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
      await fs.writeFile(
        OUTPUT_PATH,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            totalBudget: 10000,
            contractorBudget: 10000,
            allowed: [],
            priorityByPath: { "/": 1 },
          },
          null,
          2,
        ),
        "utf8",
      );
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error("Failed to generate launch index manifest");
  console.error(error);
  process.exit(1);
});
