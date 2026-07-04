import { describe, expect, it } from "vitest";

import { buildRecordingArgs } from "../../src/shared/ffmpegCommandBuilder.js";

describe("ffmpeg command builder", () => {
  it("builds a gdigrab command that excludes the mouse cursor", () => {
    const args = buildRecordingArgs({
      region: { x: 10, y: 20, width: 320, height: 180 },
      fps: 30,
      outputPath: "C:/tmp/out.mp4"
    });

    expect(args).toContain("gdigrab");
    expect(args).toContain("-draw_mouse");
    expect(args).toContain("0");
    expect(args).toContain("320x180");
    expect(args.at(-1)).toBe("C:/tmp/out.mp4");
  });
});
