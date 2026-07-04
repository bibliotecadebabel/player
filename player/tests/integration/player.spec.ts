import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const mp4Upload = resolve('public/videos/square-240-3s.mp4');
const webmUpload = resolve('public/videos/square-360-5s.webm');
const screenshotRoot = resolve('output/playwright/screenshots');
const proofFps = 24;

const currentTime = (page: Page) => page.locator('[data-testid="current-time"]');

const readVideoState = async (page: Page) =>
  page.locator('[data-testid="video-element"]').evaluate((video) => {
    const media = video as HTMLVideoElement;

    return {
      currentTime: media.currentTime,
      duration: media.duration,
      paused: media.paused,
      videoWidth: media.videoWidth,
      videoHeight: media.videoHeight,
    };
  });

const frameRange = (start: number, end: number): number[] => {
  const direction = start <= end ? 1 : -1;
  const frames: number[] = [];

  for (let frame = start; direction > 0 ? frame <= end : frame >= end; frame += direction) {
    frames.push(frame);
  }

  return frames;
};

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const timelinePointForFrame = (box: Box, frame: number, durationSeconds: number) => ({
  x: box.x + box.width * (frame / (durationSeconds * proofFps)),
  y: box.y + box.height / 2,
});

const displayedFrame = async (page: Page) =>
  page.getByTestId('frame-index').evaluate((element) => {
    const match = element.textContent?.match(/Frame\s+(\d+)/);

    if (!match) {
      throw new Error(`Frame readout did not contain a frame number: ${element.textContent}`);
    }

    return Number(match[1]);
  });

const waitForRenderedFrame = async (page: Page, expectedFrame: number) => {
  await expect(page.getByTestId('frame-index')).toContainText(`Frame ${expectedFrame}`, {
    timeout: 5_000,
  });

  await page.waitForFunction(
    ({ frame, fps }) => {
      const video = document.querySelector<HTMLVideoElement>('[data-testid="video-element"]');

      if (!video) {
        return false;
      }

      const mediaFrame = Math.round(video.currentTime * fps);

      return !video.seeking && mediaFrame === frame && video.dataset.frameIndex === String(frame);
    },
    { frame: expectedFrame, fps: proofFps },
    { timeout: 5_000, polling: 25 },
  );
};

const screenshotFrameProof = async (page: Page, testInfo: TestInfo, name: string) => {
  const screenshotPath = resolve(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: 'image/png',
  });
};

const applyCssZoom = async (page: Page, zoom: number) => {
  await page.evaluate((nextZoom) => {
    document.documentElement.style.setProperty('zoom', String(nextZoom));
  }, zoom);
};

const measureVideoDockLayout = async (page: Page) =>
  page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('[data-testid="video-stage"]');
    const video = document.querySelector<HTMLVideoElement>('[data-testid="video-element"]');
    const dock = document.querySelector<HTMLElement>('[data-testid="scrub-dock"]');
    const timeline = document.querySelector<HTMLElement>('[data-testid="timeline"]');

    if (!stage || !video || !dock || !timeline) {
      throw new Error('Video stage, video, scrub dock, or timeline missing.');
    }

    const stageRect = stage.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    const timelineRect = timeline.getBoundingClientRect();

    return {
      stage: {
        left: stageRect.left,
        right: stageRect.right,
        top: stageRect.top,
        bottom: stageRect.bottom,
        width: stageRect.width,
        height: stageRect.height,
      },
      video: {
        left: videoRect.left,
        right: videoRect.right,
        top: videoRect.top,
        bottom: videoRect.bottom,
        width: videoRect.width,
        height: videoRect.height,
      },
      dock: {
        left: dockRect.left,
        right: dockRect.right,
        top: dockRect.top,
        bottom: dockRect.bottom,
        width: dockRect.width,
        height: dockRect.height,
      },
      timeline: {
        left: timelineRect.left,
        right: timelineRect.right,
        top: timelineRect.top,
        bottom: timelineRect.bottom,
        width: timelineRect.width,
        height: timelineRect.height,
      },
    };
  });

test.beforeEach(async ({ page }) => {
  mkdirSync(screenshotRoot, { recursive: true });
  await page.goto('/');
  await applyCssZoom(page, 1);
  await expect(page.getByTestId('player-app')).toBeVisible();
});

test('plays and stops the short square clip', async ({ page }) => {
  await page.getByTestId('source-square-240-3s').click();
  await expect(page.getByTestId('proof-badge')).toContainText('240 x 240');

  await page.getByTestId('play-button').click();
  await page.waitForTimeout(1400);

  const playingState = await readVideoState(page);
  expect(playingState.currentTime).toBeGreaterThan(0.5);
  expect(playingState.paused).toBeFalsy();

  await page.getByTestId('stop-button').click();

  const stoppedState = await readVideoState(page);
  expect(stoppedState.currentTime).toBeLessThan(0.05);
  await expect(page.getByTestId('status-value')).toContainText('Stopped');
  await expect(currentTime(page)).toContainText('00:00.000');
});

test('dragging the thumb updates the displayed frame on the medium clip', async ({ page }) => {
  await page.getByTestId('source-square-360-5s').click();
  await expect(page.getByTestId('proof-badge')).toContainText('360 x 360');

  const timeline = page.getByTestId('timeline');
  const thumb = page.getByTestId('timeline-thumb');
  const box = await timeline.boundingBox();

  if (!box) {
    throw new Error('Timeline bounding box was not available.');
  }

  await thumb.hover();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  const state = await readVideoState(page);
  expect(state.currentTime).toBeGreaterThan(3.2);
  expect(state.currentTime).toBeLessThan(3.9);
  await expect(page.getByTestId('frame-index')).not.toContainText('Frame 0');
  await expect(currentTime(page)).not.toContainText('00:00.000');
});

test('resizes around several square proof sources without clipping the player', async ({ page }) => {
  const scenarios = [
    { source: 'source-square-240-3s', viewport: { width: 780, height: 720 }, expected: '240 x 240' },
    { source: 'source-square-360-5s', viewport: { width: 1180, height: 860 }, expected: '360 x 360' },
    { source: 'source-square-540-8s', viewport: { width: 680, height: 980 }, expected: '540 x 540' },
  ];

  for (const scenario of scenarios) {
    await page.setViewportSize(scenario.viewport);
    await page.getByTestId(scenario.source).click();
    await expect(page.getByTestId('proof-badge')).toContainText(scenario.expected);
    await page.getByTestId('play-button').click();
    await page.waitForTimeout(500);

    const layout = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('[data-testid="video-stage"]');
      const video = document.querySelector<HTMLVideoElement>('[data-testid="video-element"]');

      if (!stage || !video) {
        throw new Error('Stage or video element missing.');
      }

      const stageRect = stage.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      return {
        stageWidth: stageRect.width,
        stageHeight: stageRect.height,
        videoWidth: videoRect.width,
        videoHeight: videoRect.height,
      };
    });

    expect(layout.videoWidth).toBeGreaterThan(0);
    expect(layout.videoHeight).toBeGreaterThan(0);
    expect(layout.videoWidth).toBeLessThanOrEqual(layout.stageWidth);
    expect(layout.videoHeight).toBeLessThanOrEqual(layout.stageHeight);
    await expect(page.getByTestId('viewport-value')).toContainText(`${scenario.viewport.width}`);
  }
});

test('keeps the scrubber directly underneath the actual video across aspect ratios, windows, and zooms', async ({
  page,
}, testInfo) => {
  const scenarios = [
    {
      name: 'square-full-window-100pct',
      source: 'source-square-540-8s',
      expected: '540 x 540',
      viewport: { width: 1366, height: 768 },
      zoom: 1,
    },
    {
      name: 'square-partial-window-200pct',
      source: 'source-square-360-5s',
      expected: '360 x 360',
      viewport: { width: 820, height: 820 },
      zoom: 2,
    },
    {
      name: 'wide-full-window-100pct',
      source: 'source-wide-640-4s',
      expected: '640 x 360',
      viewport: { width: 1440, height: 760 },
      zoom: 1,
    },
    {
      name: 'wide-short-window-150pct',
      source: 'source-wide-640-4s',
      expected: '640 x 360',
      viewport: { width: 920, height: 540 },
      zoom: 1.5,
    },
    {
      name: 'tall-phone-window-100pct',
      source: 'source-tall-360-4s',
      expected: '360 x 640',
      viewport: { width: 430, height: 920 },
      zoom: 1,
    },
    {
      name: 'tall-partial-window-200pct',
      source: 'source-tall-360-4s',
      expected: '360 x 640',
      viewport: { width: 620, height: 760 },
      zoom: 2,
    },
  ];
  const measurements: Array<{
    name: string;
    zoom: number;
    viewport: { width: number; height: number };
    videoToDockGap: number;
    widthDelta: number;
    videoWidth: number;
    videoHeight: number;
  }> = [];

  for (const scenario of scenarios) {
    await page.setViewportSize(scenario.viewport);
    await applyCssZoom(page, scenario.zoom);
    await page.getByTestId(scenario.source).click();
    await expect(page.getByTestId('proof-badge')).toContainText(scenario.expected);

    const layout = await measureVideoDockLayout(page);
    const gap = layout.dock.top - layout.video.bottom;
    const maxAllowedGap = 8 * scenario.zoom;
    const widthDelta = Math.abs(layout.dock.width - layout.video.width);

    measurements.push({
      name: scenario.name,
      zoom: scenario.zoom,
      viewport: scenario.viewport,
      videoToDockGap: gap,
      widthDelta,
      videoWidth: layout.video.width,
      videoHeight: layout.video.height,
    });

    expect(gap).toBeGreaterThanOrEqual(-1);
    expect(gap).toBeLessThanOrEqual(maxAllowedGap);
    expect(Math.abs(layout.dock.left - layout.video.left)).toBeLessThanOrEqual(3);
    expect(Math.abs(layout.dock.right - layout.video.right)).toBeLessThanOrEqual(3);
    expect(Math.abs(layout.dock.width - layout.video.width)).toBeLessThanOrEqual(3);
    expect(layout.video.width).toBeGreaterThan(90);
    expect(layout.video.height).toBeGreaterThan(90);
    expect(layout.timeline.top).toBeGreaterThan(layout.dock.top);
    expect(layout.timeline.bottom).toBeLessThan(layout.dock.bottom);
    expect(layout.timeline.width).toBeGreaterThan(layout.dock.width * 0.9);
    expect(layout.timeline.height).toBeGreaterThanOrEqual(16);
    expect(layout.dock.bottom).toBeLessThanOrEqual(layout.stage.bottom + 1);

    const screenshotPath = resolve(screenshotRoot, `scrubber-tight-to-video-${scenario.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach(`scrubber-tight-to-video-${scenario.name}`, {
      path: screenshotPath,
      contentType: 'image/png',
    });
  }

  const measurementsPath = resolve(screenshotRoot, 'scrubber-tight-to-video-measurements.json');
  writeFileSync(measurementsPath, `${JSON.stringify(measurements, null, 2)}\n`);
  await testInfo.attach('scrubber-tight-to-video-measurements', {
    path: measurementsPath,
    contentType: 'application/json',
  });
});

test('maps one-frame scrub trajectories to rendered frames without skipping', async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 1180, height: 860 });
  await page.getByTestId('source-square-360-5s').click();
  await expect(page.getByTestId('proof-badge')).toContainText('360 x 360');

  const timeline = page.getByTestId('timeline');
  await timeline.scrollIntoViewIfNeeded();
  const box = await timeline.boundingBox();

  if (!box) {
    throw new Error('Timeline bounding box was not available.');
  }

  const assertTrajectory = async (name: string, frames: number[], screenshotFrames: number[]) => {
    const start = timelinePointForFrame(box, frames[0], 5);
    const observedFrames: number[] = [];

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();

    for (const frame of frames) {
      const point = timelinePointForFrame(box, frame, 5);
      await page.mouse.move(point.x, point.y);
      await waitForRenderedFrame(page, frame);

      const observedFrame = await displayedFrame(page);
      observedFrames.push(observedFrame);

      if (screenshotFrames.includes(frame)) {
        await screenshotFrameProof(page, testInfo, `frame-continuity-${name}-frame-${frame}`);
      }
    }

    await page.mouse.up();
    expect(observedFrames).toEqual(frames);
  };

  await assertTrajectory('forward', frameRange(12, 36), [12, 24, 36]);
  await assertTrajectory('reverse', frameRange(84, 60), [84, 72, 60]);
  await assertTrajectory('zigzag', [...frameRange(44, 52), ...frameRange(51, 46), ...frameRange(47, 56)], [
    44,
    52,
    46,
    56,
  ]);
});

test('adversarial control churn keeps the long clip stable', async ({ page }) => {
  await page.getByTestId('source-square-540-8s').click();
  await page.getByTestId('play-button').click();
  await page.waitForTimeout(600);

  const timeline = page.getByTestId('timeline');
  await timeline.scrollIntoViewIfNeeded();
  const box = await timeline.boundingBox();

  if (!box) {
    throw new Error('Timeline bounding box was not available.');
  }

  const positions = [0.12, 0.88, 0.34, 0.96, 0.04];

  for (const position of positions) {
    await page.mouse.move(box.x + box.width * position, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * position, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.getByTestId('play-button').click();
    await page.waitForTimeout(250);
    await page.getByTestId('stop-button').click();
  }

  const state = await readVideoState(page);
  expect(Number.isFinite(state.duration)).toBeTruthy();
  expect(state.currentTime).toBeLessThan(0.05);
  await expect(page.getByTestId('status-value')).toContainText('Stopped');
});

test('opens local MP4 and WebM files from disk', async ({ page }) => {
  const input = page.getByTestId('file-input');

  await input.setInputFiles(mp4Upload);
  await expect(page.getByTestId('source-value')).toContainText('square-240-3s.mp4');
  await expect(page.getByTestId('note-value')).toContainText('Local file opened');
  await page.getByTestId('play-button').click();
  await page.waitForTimeout(1000);

  let state = await readVideoState(page);
  expect(state.currentTime).toBeGreaterThan(0.3);
  await expect(page.getByTestId('proof-badge')).toContainText('240 x 240');

  await input.setInputFiles(webmUpload);
  await expect(page.getByTestId('source-value')).toContainText('square-360-5s.webm');
  await page.getByTestId('play-button').click();
  await page.waitForTimeout(1000);

  state = await readVideoState(page);
  expect(state.currentTime).toBeGreaterThan(0.3);
  await expect(page.getByTestId('proof-badge')).toContainText('360 x 360');
});
