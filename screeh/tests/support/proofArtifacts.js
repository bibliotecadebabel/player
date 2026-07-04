import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function uniqueArtifactRoot(name) {
  const token = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("output", "test-results", `${token}-${name}`);
}

export async function waitForStableFile(filePath, timeoutMs = 20000) {
  const start = Date.now();
  let lastSize = -1;
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > 0 && stats.size === lastSize) {
        stableCount += 1;
        if (stableCount >= 3) {
          return;
        }
      } else {
        stableCount = 0;
        lastSize = stats.size;
      }
    } catch {
      stableCount = 0;
    }

    await new Promise(resolve => setTimeout(resolve, 350));
  }

  throw new Error(`Timed out waiting for file to stabilize: ${filePath}`);
}

export async function probeMedia(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    filePath
  ]);
  const data = JSON.parse(stdout);
  const videoStream = data.streams.find(stream => stream.codec_type === "video");

  return {
    video: {
      width: Number(videoStream.width),
      height: Number(videoStream.height),
      codec: videoStream.codec_name
    },
    format: {
      duration: Number(data.format.duration),
      size: Number(data.format.size)
    }
  };
}

export async function createContactSheet(videoPath, proofRoot) {
  const outputPattern = path.join(proofRoot, "frame-%02d.png");
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-vf",
    "fps=1",
    "-frames:v",
    "3",
    outputPattern
  ]);
}
