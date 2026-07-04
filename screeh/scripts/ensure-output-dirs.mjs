import fs from "node:fs";
import path from "node:path";

const directories = [
  "output",
  "output/recordings",
  "output/proof",
  "output/playwright",
  "output/playwright/results",
  "output/test-results",
  "output/red-team"
];

for (const directory of directories) {
  fs.mkdirSync(path.resolve(directory), { recursive: true });
  const gitkeepPath = path.resolve(directory, ".gitkeep");
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "");
  }
}
