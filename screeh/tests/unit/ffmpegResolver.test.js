import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatFfmpegSpawnError,
  resolveFfmpegPath
} from "../../src/main/recording/ffmpegResolver.js";

describe("ffmpeg resolver", () => {
  it("honors an explicit ffmpeg path", () => {
    expect(
      resolveFfmpegPath({
        SCREENREC_FFMPEG_PATH: "C:/tools/ffmpeg.exe"
      })
    ).toBe(path.resolve("C:/tools/ffmpeg.exe"));
  });

  it("resolves the bundled ffmpeg binary by default", () => {
    const ffmpegPath = resolveFfmpegPath({});

    expect(ffmpegPath).toMatch(/ffmpeg/i);
    expect(fs.existsSync(ffmpegPath)).toBe(true);
  });

  it("formats missing ffmpeg errors with setup guidance", () => {
    const error = Object.assign(new Error("spawn ffmpeg ENOENT"), {
      code: "ENOENT"
    });

    expect(formatFfmpegSpawnError(error, "ffmpeg.exe")).toMatch(/setup\.ps1/i);
  });
});
