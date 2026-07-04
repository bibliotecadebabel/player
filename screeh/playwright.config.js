import path from "node:path";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  timeout: 60000,
  outputDir: path.resolve("output", "playwright", "results"),
  use: {
    video: "on"
  }
});
