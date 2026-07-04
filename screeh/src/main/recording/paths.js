import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

export function getArtifactRoot(explicitRoot) {
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  return process.env.SCREENREC_ARTIFACT_ROOT
    ? path.resolve(process.env.SCREENREC_ARTIFACT_ROOT)
    : path.join(repoRoot, "output");
}

export function ensureArtifactDirectories(root = getArtifactRoot()) {
  const directories = [
    root,
    path.join(root, "recordings"),
    path.join(root, "proof"),
    path.join(root, "playwright"),
    path.join(root, "test-results"),
    path.join(root, "red-team")
  ];

  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return directories;
}

export function buildRecordingFilePath(label = "capture", root = getArtifactRoot()) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(root, "recordings", `${timestamp}-${label}.mp4`);
}

export function buildManifestPath(recordingPath) {
  return recordingPath.replace(/\.mp4$/i, ".json");
}
