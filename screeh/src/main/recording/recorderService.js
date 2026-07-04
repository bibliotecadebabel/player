import fs from "node:fs";
import { spawn } from "node:child_process";

import { buildRecordingArgs } from "../../shared/ffmpegCommandBuilder.js";
import { formatFfmpegSpawnError, resolveFfmpegPath } from "./ffmpegResolver.js";
import {
  buildManifestPath,
  buildRecordingFilePath,
  ensureArtifactDirectories,
  getArtifactRoot
} from "./paths.js";

export class RecorderService {
  constructor(options = {}) {
    this.spawnProcess = options.spawnProcess ?? spawn;
    this.ffmpegPath = options.ffmpegPath ?? resolveFfmpegPath();
    this.fps = options.fps ?? 30;
    this.artifactRoot = getArtifactRoot(options.artifactRoot);
    this.currentSession = null;
    this.startupProbeMs = options.startupProbeMs ?? 150;
    ensureArtifactDirectories(this.artifactRoot);
  }

  isRecording() {
    return Boolean(this.currentSession);
  }

  async start({ region, square, label = "capture" }) {
    if (this.currentSession) {
      throw new Error("A recording is already in progress.");
    }

    const captureRegion = region ?? square;
    const outputPath = buildRecordingFilePath(label, this.artifactRoot);
    const manifestPath = buildManifestPath(outputPath);
    const startedAt = new Date().toISOString();
    const args = buildRecordingArgs({
      region: captureRegion,
      fps: this.fps,
      outputPath
    });
    const child = this.spawnProcess(this.ffmpegPath, args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    const stderrBuffer = [];
    child.stderr.on("data", chunk => {
      stderrBuffer.push(chunk.toString());
    });

    const exitPromise = new Promise(resolve => {
      child.once("error", error => {
        resolve({
          code: null,
          signal: null,
          stderr: stderrBuffer.join(""),
          spawnError: error
        });
      });
      child.once("exit", (code, signal) => {
        resolve({ code, signal, stderr: stderrBuffer.join("") });
      });
    });

    const startupResult = await Promise.race([
      exitPromise,
      new Promise(resolve => {
        setTimeout(() => resolve(null), this.startupProbeMs);
      })
    ]);

    if (startupResult?.spawnError || startupResult?.code !== undefined) {
      const stoppedAt = new Date().toISOString();
      const message = startupResult.spawnError
        ? formatFfmpegSpawnError(startupResult.spawnError, this.ffmpegPath)
        : `ffmpeg exited during startup with code ${startupResult.code}`;

      fs.writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            outputPath,
            region: captureRegion,
            startedAt,
            stoppedAt,
            status: "failed",
            ffmpegPath: this.ffmpegPath,
            ffmpegExitCode: startupResult.code,
            ffmpegSignal: startupResult.signal,
            ffmpegStderr: startupResult.stderr,
            error: message
          },
          null,
          2
        )
      );

      throw new Error(message);
    }

    this.currentSession = {
      child,
      region: captureRegion,
      outputPath,
      manifestPath,
      startedAt,
      exitPromise
    };

    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          outputPath,
          region: captureRegion,
          startedAt,
          ffmpegPath: this.ffmpegPath,
          status: "recording"
        },
        null,
        2
      )
    );

    return {
      outputPath,
      manifestPath,
      startedAt
    };
  }

  async stop() {
    if (!this.currentSession) {
      return {
        stopped: false,
        reason: "idle"
      };
    }

    const session = this.currentSession;
    this.currentSession = null;
    session.child.stdin.write("q");
    session.child.stdin.end();

    const exitResult = await session.exitPromise;
    const stoppedAt = new Date().toISOString();
    const wasSuccessful = exitResult.code === 0 || exitResult.code === 255;

    fs.writeFileSync(
      session.manifestPath,
      JSON.stringify(
        {
          outputPath: session.outputPath,
          region: session.region,
          startedAt: session.startedAt,
          stoppedAt,
          status: wasSuccessful ? "completed" : "failed",
          ffmpegPath: this.ffmpegPath,
          ffmpegExitCode: exitResult.code,
          ffmpegSignal: exitResult.signal,
          ffmpegStderr: exitResult.stderr
        },
        null,
        2
      )
    );

    if (!wasSuccessful) {
      throw new Error(`ffmpeg exited with code ${exitResult.code}`);
    }

    return {
      stopped: true,
      outputPath: session.outputPath,
      manifestPath: session.manifestPath,
      stoppedAt
    };
  }
}
