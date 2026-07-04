import fs from "node:fs/promises";
import path from "node:path";

async function collectProofDirectories(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(root, entry.name));
}

async function main() {
  const testResultsRoot = path.resolve("output", "test-results");
  const runs = await collectProofDirectories(testResultsRoot);

  if (runs.length < 3) {
    throw new Error("Expected at least three proof runs in output/test-results.");
  }

  let validatedRuns = 0;

  for (const run of runs) {
    const proofRoot = path.join(run, "proof");
    const proofCases = await collectProofDirectories(proofRoot);

    for (const proofCase of proofCases) {
      const metadataPath = path.join(proofCase, "metadata.json");
      const files = await fs.readdir(proofCase).catch(() => []);
      const frames = files.filter(file => file.endsWith(".png"));

      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
        if (metadata.video.width > 0 && metadata.video.height > 0 && metadata.format.duration > 1 && frames.length >= 1) {
          validatedRuns += 1;
        }
      } catch {
        // ignore invalid proof directories
      }
    }
  }

  if (validatedRuns < 3) {
    throw new Error("Proof verification failed. Expected three validated recordings with frame artifacts.");
  }

  const summaryPath = path.resolve("output", "proof", "verification-summary.json");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(
      {
        validatedRuns,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
