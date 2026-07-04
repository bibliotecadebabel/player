import fs from "node:fs/promises";
import path from "node:path";

const summary = {
  generatedAt: new Date().toISOString(),
  scenarios: [
    {
      name: "extreme-region-clamping",
      goal: "Clamp overlarge or out-of-bounds bounding boxes back into the viewport."
    },
    {
      name: "idle-stop-safety",
      goal: "Treat stop requests while idle as safe no-ops."
    },
    {
      name: "ffmpeg-failure-surfacing",
      goal: "Surface encoder failures instead of silently reporting success."
    }
  ]
};

const outputPath = path.resolve("output", "red-team", "adversarial-summary.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
