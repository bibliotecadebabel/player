import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function resolveFfmpegPath(env = process.env) {
  if (env.SCREENREC_FFMPEG_PATH) {
    return path.resolve(env.SCREENREC_FFMPEG_PATH);
  }

  try {
    const bundledPath = require("ffmpeg-static");
    if (bundledPath && fs.existsSync(bundledPath)) {
      return bundledPath;
    }
  } catch {
    // Fall back to PATH below so tests and custom deployments can still inject ffmpeg.
  }

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

export function formatFfmpegSpawnError(error, ffmpegPath) {
  if (error?.code === "ENOENT") {
    return [
      `ffmpeg was not found at "${ffmpegPath}".`,
      "Run .\\setup.ps1 from the project folder, then start the app with .\\start.ps1."
    ].join(" ");
  }

  if (error?.message) {
    return `ffmpeg failed to start from "${ffmpegPath}": ${error.message}`;
  }

  return `ffmpeg failed to start from "${ffmpegPath}".`;
}
