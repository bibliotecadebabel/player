import { spawnSync } from "node:child_process";
import fs from "node:fs";

import ffmpegPath from "ffmpeg-static";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const [major, minor, patch] = process.versions.node.split(".").map(Number);
const isAtLeast = (targetMajor, targetMinor, targetPatch) => {
  if (major !== targetMajor) {
    return false;
  }
  if (minor !== targetMinor) {
    return minor > targetMinor;
  }
  return patch >= targetPatch;
};
const nodeSupported = isAtLeast(22, 22, 2) || isAtLeast(24, 14, 1);

console.log(`Node.js ${process.version}`);
if (!nodeSupported) {
  fail("Unsupported Node.js runtime. Use .\\setup.ps1 and .\\start.ps1 so the project uses its portable Node runtime.");
}

if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  fail("Bundled ffmpeg binary is missing. Run .\\setup.ps1 from the project folder.");
} else {
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-version"], {
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    fail(`Bundled ffmpeg failed to execute: ${result.error?.message ?? result.stderr}`);
  } else {
    console.log(`ffmpeg ${result.stdout.split("\n")[0]}`);
    console.log(`ffmpegPath ${ffmpegPath}`);
  }
}
