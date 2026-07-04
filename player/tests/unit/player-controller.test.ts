import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerElements } from '../../src/app-shell';
import { VideoPlayerController } from '../../src/player-controller';
import { demoVideos } from '../../src/video-library';

const defineMediaState = (video: HTMLVideoElement, duration = 5): void => {
  let paused = true;
  let currentTime = 0;

  Object.defineProperty(video, 'duration', {
    configurable: true,
    get: () => duration,
  });

  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => currentTime,
    set: (value: number) => {
      currentTime = value;
    },
  });

  Object.defineProperty(video, 'paused', {
    configurable: true,
    get: () => paused,
  });

  video.play = vi.fn(async () => {
    paused = false;
    video.dispatchEvent(new Event('play'));
  });

  video.pause = vi.fn(() => {
    paused = true;
    video.dispatchEvent(new Event('pause'));
  });

  video.load = vi.fn(() => undefined);
};

describe('VideoPlayerController', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:local-video'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('loads the default source and updates metadata after initialization', () => {
    const container = document.querySelector<HTMLElement>('#app');
    expect(container).not.toBeNull();

    const elements = createPlayerElements(container!, demoVideos);
    defineMediaState(elements.video, demoVideos[0].durationSeconds);

    const controller = new VideoPlayerController({
      elements,
      videos: demoVideos,
      windowObject: window,
    });

    controller.init();
    elements.video.dispatchEvent(new Event('loadedmetadata'));

    expect(elements.sourceValue.textContent).toBe('Square 240');
    expect(elements.duration.textContent).toBe('00:03.000');
    expect(elements.statusValue.textContent).toBe('Ready');
  });

  it('stops playback and rewinds to the first frame', async () => {
    const elements = createPlayerElements(document.querySelector<HTMLElement>('#app')!, demoVideos);
    defineMediaState(elements.video, demoVideos[1].durationSeconds);

    const controller = new VideoPlayerController({
      elements,
      videos: demoVideos,
      windowObject: window,
    });

    controller.init();
    elements.video.dispatchEvent(new Event('loadedmetadata'));

    await controller.play();
    controller.scrubToRatio(0.6);
    controller.stop();

    expect(elements.currentTime.textContent).toBe('00:00.000');
    expect(elements.frameIndex.textContent).toBe('Frame 0');
    expect(elements.statusValue.textContent).toBe('Stopped');
  });

  it('supports dragging the scrubber thumb and resumes playback if it was already playing', async () => {
    const elements = createPlayerElements(document.querySelector<HTMLElement>('#app')!, demoVideos);
    defineMediaState(elements.video, demoVideos[2].durationSeconds);
    vi.spyOn(elements.timeline, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 16,
      top: 0,
      left: 100,
      right: 500,
      bottom: 16,
      x: 100,
      y: 0,
      toJSON: () => undefined,
    });

    const controller = new VideoPlayerController({
      elements,
      videos: demoVideos,
      windowObject: window,
    });

    controller.init();
    elements.video.dispatchEvent(new Event('loadedmetadata'));
    await controller.play();

    elements.timeline.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 380 }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 420 }));

    expect(elements.currentTime.textContent).toBe('00:06.416');
    expect(elements.frameIndex.textContent).toBe('Frame 154');
    expect(elements.statusValue.textContent).toBe('Playing');
  });

  it('opens a local file from the file picker and updates the selected source', () => {
    const elements = createPlayerElements(document.querySelector<HTMLElement>('#app')!, demoVideos);
    defineMediaState(elements.video, demoVideos[0].durationSeconds);
    elements.video.canPlayType = vi.fn((_type: string): CanPlayTypeResult => 'probably');

    const controller = new VideoPlayerController({
      elements,
      videos: demoVideos,
      windowObject: window,
    });

    controller.init();

    const file = new File(['proof'], 'local-proof.webm', { type: 'video/webm' });
    Object.defineProperty(elements.fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    elements.fileInput.dispatchEvent(new Event('change'));

    expect(elements.sourceValue.textContent).toBe('local-proof.webm');
    expect(elements.noteValue.textContent).toContain('Local file opened');
    expect(elements.proofBadge.textContent).toBe('Loading local file');
  });
});
