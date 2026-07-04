import { describe, expect, it } from "vitest";

import {
  clampRegionToBounds,
  makeRegionFromDrag,
  normalizeCaptureRegion
} from "../../src/shared/selectionMath.js";

describe("selection math", () => {
  it("creates a bounding box from positive drag deltas", () => {
    expect(
      makeRegionFromDrag({ x: 10, y: 12 }, { x: 80, y: 44 })
    ).toEqual({
      x: 10,
      y: 12,
      width: 70,
      height: 32
    });
  });

  it("creates a bounding box from negative drag deltas", () => {
    expect(
      makeRegionFromDrag({ x: 120, y: 140 }, { x: 80, y: 60 })
    ).toEqual({
      x: 80,
      y: 60,
      width: 40,
      height: 80
    });
  });

  it("clamps the region to the available bounds and keeps dimensions even", () => {
    expect(
      clampRegionToBounds(
        { x: 400, y: 500, width: 311, height: 177 },
        { width: 640, height: 640 },
        48
      )
    ).toEqual({
      x: 330,
      y: 464,
      width: 310,
      height: 176
    });
  });

  it("normalizes viewport coordinates into screen coordinates with scale factor", () => {
    expect(
      normalizeCaptureRegion(
        { x: 20, y: 30, width: 200, height: 120 },
        { width: 800, height: 600 },
        { x: 100, y: 150 },
        1.5
      )
    ).toEqual({
      viewportRegion: { x: 20, y: 30, width: 200, height: 120 },
      screenRegion: { x: 180, y: 270, width: 300, height: 180 }
    });
  });
});
