import fs from "node:fs/promises";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";

import {
  createContactSheet,
  probeMedia,
  uniqueArtifactRoot,
  waitForStableFile
} from "../support/proofArtifacts.js";

const cases = [
  {
    name: "external-wide-short",
    offset: { x: 80, y: 92 },
    initial: { width: 120, height: 90 },
    resizes: [
      { handle: "e", dx: 50, dy: 0 },
      { handle: "s", dx: 0, dy: 44 }
    ],
    expected: { width: 170, height: 134 },
    durationMs: 1800
  },
  {
    name: "external-tall-medium",
    offset: { x: 160, y: 150 },
    initial: { width: 140, height: 190 },
    resizes: [
      { handle: "n", dx: 0, dy: -30 },
      { handle: "e", dx: 70, dy: 0 }
    ],
    expected: { width: 210, height: 220 },
    durationMs: 2600
  },
  {
    name: "external-large-custom",
    offset: { x: 120, y: 118 },
    initial: { width: 260, height: 180 },
    resizes: [
      { handle: "e", dx: 84, dy: 0 },
      { handle: "s", dx: 0, dy: 52 }
    ],
    expected: { width: 344, height: 232 },
    durationMs: 4200
  }
];

async function waitForWindowTitle(electronApp, title) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    for (const page of electronApp.windows()) {
      if ((await page.title().catch(() => "")) === title) {
        return page;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for window: ${title}`);
}

async function getWindowSnapshot(electronApp) {
  return electronApp.evaluate(({ BrowserWindow, screen }) =>
    BrowserWindow.getAllWindows().map(window => {
      const bounds = window.getBounds();
      return {
        title: window.getTitle(),
        bounds,
        contentBounds: window.getContentBounds(),
        visible: window.isVisible(),
        scaleFactor: screen.getDisplayMatching(bounds).scaleFactor
      };
    })
  );
}

function findWindow(snapshot, title) {
  const found = snapshot.find(window => window.title === title);
  if (!found) {
    throw new Error(`Window not found in snapshot: ${title}`);
  }
  return found;
}

function rectanglesOverlap(first, second) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

async function dragResizeHandle(page, handle, movement) {
  const handleBox = await page.locator(`[data-testid='resize-handle-${handle}']`).boundingBox();
  if (!handleBox) {
    throw new Error(`Resize handle not found: ${handle}`);
  }

  const start = {
    x: handleBox.x + handleBox.width / 2,
    y: handleBox.y + handleBox.height / 2
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + movement.dx, start.y + movement.dy, { steps: 10 });
  await page.mouse.up();
}

test.describe("outside-window bounding-box recording proof", () => {
  for (const scenario of cases) {
    test(`records resized ${scenario.name} to mp4`, async ({}, testInfo) => {
      const artifactRoot = uniqueArtifactRoot(scenario.name);
      const electronApp = await electron.launch({
        args: ["src/main/main.js"],
        env: {
          ...process.env,
          SCREENREC_ARTIFACT_ROOT: artifactRoot,
          SCREENREC_TEST_MODE: "1",
          SCREENREC_SHOW_TEST_TARGET: "1"
        }
      });

      try {
        const mainPage = await waitForWindowTitle(electronApp, "Bounding Box Screen Recorder");
        const targetPage = await waitForWindowTitle(electronApp, "External Recording Target");

        await mainPage.waitForSelector("[data-testid='record-button']");
        await targetPage.waitForSelector("[data-testid='external-target']");
        await mainPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-main-before-record.png`)
        });
        await targetPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-external-target-before-record.png`)
        });

        const beforeSelection = await getWindowSnapshot(electronApp);
        const mainBefore = findWindow(beforeSelection, "Bounding Box Screen Recorder");
        const targetBefore = findWindow(beforeSelection, "External Recording Target");
        expect(rectanglesOverlap(mainBefore.bounds, targetBefore.bounds)).toBe(false);

        await mainPage.click("[data-testid='record-button']");
        const overlayPage = await waitForWindowTitle(electronApp, "Square Recorder Selection Overlay");
        await overlayPage.waitForSelector("[data-testid='global-selection-overlay']");
        await overlayPage.waitForFunction(() => document.body.dataset.ready === "true");

        const selectingSnapshot = await getWindowSnapshot(electronApp);
        const mainSelecting = findWindow(selectingSnapshot, "Bounding Box Screen Recorder");
        const overlaySelecting = findWindow(selectingSnapshot, "Square Recorder Selection Overlay");
        const targetSelecting = findWindow(selectingSnapshot, "External Recording Target");

        expect(mainSelecting.visible).toBe(false);
        expect(targetSelecting.visible).toBe(true);

        const start = {
          x: targetSelecting.contentBounds.x - overlaySelecting.bounds.x + scenario.offset.x,
          y: targetSelecting.contentBounds.y - overlaySelecting.bounds.y + scenario.offset.y
        };
        const end = {
          x: start.x + scenario.initial.width,
          y: start.y + scenario.initial.height
        };

        await overlayPage.mouse.move(start.x, start.y);
        await overlayPage.mouse.down();
        await overlayPage.mouse.move(end.x, end.y, { steps: 14 });
        await overlayPage.mouse.up();
        await expect(overlayPage.locator("[data-testid='selection-toolbar']")).toBeVisible();
        await overlayPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-initial-bounding-box.png`)
        });

        for (const resize of scenario.resizes) {
          await dragResizeHandle(overlayPage, resize.handle, resize);
        }

        await expect(overlayPage.locator("[data-testid='global-selection-label']")).toHaveText(
          `${scenario.expected.width} x ${scenario.expected.height} px`
        );
        await overlayPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-resized-bounding-box.png`)
        });
        await overlayPage.click("[data-testid='overlay-start-recording']");

        const stopPage = await waitForWindowTitle(electronApp, "Square Recorder Stop Control");
        await stopPage.waitForSelector("[data-testid='floating-stop-button']");
        await stopPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-floating-stop-control.png`)
        });

        const recordingSnapshot = await getWindowSnapshot(electronApp);
        expect(findWindow(recordingSnapshot, "Bounding Box Screen Recorder").visible).toBe(false);
        expect(findWindow(recordingSnapshot, "External Recording Target").visible).toBe(true);
        expect(findWindow(recordingSnapshot, "Square Recorder Stop Control").visible).toBe(true);

        await targetPage.waitForTimeout(scenario.durationMs);
        await stopPage.click("[data-testid='floating-stop-button']");
        await expect(mainPage.locator("[data-testid='mode-label']")).toHaveText("idle");
        await mainPage.screenshot({
          path: testInfo.outputPath(`${scenario.name}-main-after-stop.png`)
        });

        const outputPath = await mainPage.locator("[data-testid='last-output-path']").textContent();
        expect(outputPath).toBeTruthy();
        expect(outputPath.endsWith(".mp4")).toBe(true);

        await waitForStableFile(outputPath);
        const metadata = await probeMedia(outputPath);
        const manifest = JSON.parse(await fs.readFile(outputPath.replace(/\.mp4$/i, ".json"), "utf8"));
        const captureRegion = manifest.region;

        expect(captureRegion.width).toBe(scenario.expected.width);
        expect(captureRegion.height).toBe(scenario.expected.height);
        expect(metadata.video.width).toBe(captureRegion.width);
        expect(metadata.video.height).toBe(captureRegion.height);
        expect(metadata.video.width).not.toBe(metadata.video.height);
        expect(metadata.format.duration).toBeGreaterThanOrEqual((scenario.durationMs - 500) / 1000);
        expect(manifest.outputPath.endsWith(".mp4")).toBe(true);

        const selectedCenter = {
          x: captureRegion.x / targetSelecting.scaleFactor + captureRegion.width / targetSelecting.scaleFactor / 2,
          y: captureRegion.y / targetSelecting.scaleFactor + captureRegion.height / targetSelecting.scaleFactor / 2
        };
        expect(selectedCenter.x).toBeGreaterThanOrEqual(targetSelecting.contentBounds.x);
        expect(selectedCenter.y).toBeGreaterThanOrEqual(targetSelecting.contentBounds.y);
        expect(selectedCenter.x).toBeLessThanOrEqual(targetSelecting.contentBounds.x + targetSelecting.contentBounds.width);
        expect(selectedCenter.y).toBeLessThanOrEqual(targetSelecting.contentBounds.y + targetSelecting.contentBounds.height);

        const proofRoot = path.join(artifactRoot, "proof", scenario.name);
        await fs.mkdir(proofRoot, { recursive: true });
        await createContactSheet(outputPath, proofRoot);
        await fs.writeFile(
          path.join(proofRoot, "metadata.json"),
          JSON.stringify(
            {
              ...metadata,
              manifest,
              externalTargetBounds: targetSelecting.contentBounds
            },
            null,
            2
          )
        );
      } finally {
        await electronApp.close();
      }
    });
  }
});
