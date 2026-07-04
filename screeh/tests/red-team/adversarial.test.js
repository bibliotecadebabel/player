import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { RecorderService } from "../../src/main/recording/recorderService.js";
import { clampRegionToBounds } from "../../src/shared/selectionMath.js";

function createFakeChild(exitCode) {
  const stderr = new EventEmitter();
  const child = new EventEmitter();
  child.stderr = stderr;
  child.stdin = {
    write() {},
    end() {
      setImmediate(() => {
        child.emit("exit", exitCode, null);
      });
    }
  };
  return child;
}

describe("adversarial scenarios", () => {
  it("clamps extreme selections back inside the viewport", () => {
    expect(
      clampRegionToBounds(
        { x: -300, y: 800, width: 777, height: 333 },
        { width: 640, height: 480 },
        48
      )
    ).toEqual({
      x: 0,
      y: 148,
      width: 640,
      height: 332
    });
  });

  it("treats stop while idle as safe", async () => {
    const service = new RecorderService({
      spawnProcess: () => {
        throw new Error("spawn should not be called");
      }
    });

    await expect(service.stop()).resolves.toEqual({
      stopped: false,
      reason: "idle"
    });
  });

  it("surfaces ffmpeg failures cleanly", async () => {
    const service = new RecorderService({
      spawnProcess: () => createFakeChild(1)
    });

    await service.start({
      region: { x: 10, y: 20, width: 320, height: 180 },
      label: "failure"
    });

    await expect(service.stop()).rejects.toThrow(/ffmpeg exited with code 1/i);
  });
});
