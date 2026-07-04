import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RecorderService } from "../../src/main/recording/recorderService.js";

function createFakeChild(exitCode = 0) {
  const stderr = new EventEmitter();
  const child = new EventEmitter();
  const writes = [];

  child.stderr = stderr;
  child.stdin = {
    write(chunk) {
      writes.push(chunk);
    },
    end() {
      setImmediate(() => {
        child.emit("exit", exitCode, null);
      });
    }
  };

  return { child, writes };
}

function createSpawnErrorChild() {
  const child = new EventEmitter();
  const error = Object.assign(new Error("spawn ffmpeg ENOENT"), {
    code: "ENOENT"
  });

  child.stderr = new EventEmitter();
  child.stdin = {
    write() {},
    end() {}
  };

  setImmediate(() => {
    child.emit("error", error);
  });

  return child;
}

describe("RecorderService", () => {
  const createdRoots = [];

  afterEach(async () => {
    await Promise.all(
      createdRoots.splice(0).map(directory =>
        fs.rm(directory, {
          recursive: true,
          force: true
        })
      )
    );
  });

  it("starts and stops a recording session", async () => {
    const fake = createFakeChild(0);
    const artifactRoot = await fs.mkdtemp(path.join(os.tmpdir(), "screenrec-functional-"));
    createdRoots.push(artifactRoot);
    const service = new RecorderService({
      spawnProcess: () => fake.child,
      artifactRoot,
      startupProbeMs: 0
    });

    const startResult = await service.start({
      region: { x: 12, y: 16, width: 320, height: 180 },
      label: "functional"
    });

    expect(startResult.outputPath).toContain("functional.mp4");
    expect(service.isRecording()).toBe(true);

    const stopResult = await service.stop();

    expect(stopResult.stopped).toBe(true);
    expect(fake.writes).toEqual(["q"]);
    expect(service.isRecording()).toBe(false);
  });

  it("prevents overlapping recording sessions", async () => {
    const fake = createFakeChild(0);
    const artifactRoot = await fs.mkdtemp(path.join(os.tmpdir(), "screenrec-functional-"));
    createdRoots.push(artifactRoot);
    const service = new RecorderService({
      spawnProcess: () => fake.child,
      artifactRoot,
      startupProbeMs: 0
    });

    await service.start({
      region: { x: 0, y: 0, width: 220, height: 180 },
      label: "first"
    });

    await expect(
      service.start({
        region: { x: 10, y: 10, width: 220, height: 180 },
        label: "second"
      })
    ).rejects.toThrow(/already in progress/i);

    await service.stop();
  });

  it("fails startup cleanly when ffmpeg is missing", async () => {
    const artifactRoot = await fs.mkdtemp(path.join(os.tmpdir(), "screenrec-functional-"));
    createdRoots.push(artifactRoot);
    const service = new RecorderService({
      spawnProcess: () => createSpawnErrorChild(),
      ffmpegPath: "C:/missing/ffmpeg.exe",
      artifactRoot,
      startupProbeMs: 25
    });

    await expect(
      service.start({
        region: { x: 4, y: 8, width: 160, height: 120 },
        label: "missing-ffmpeg"
      })
    ).rejects.toThrow(/setup\.ps1/i);

    expect(service.isRecording()).toBe(false);
    const manifests = await fs.readdir(path.join(artifactRoot, "recordings"));
    const manifestPath = path.join(
      artifactRoot,
      "recordings",
      manifests.find(file => file.endsWith(".json"))
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    expect(manifest.status).toBe("failed");
    expect(manifest.error).toMatch(/ffmpeg was not found/i);
  });
});
