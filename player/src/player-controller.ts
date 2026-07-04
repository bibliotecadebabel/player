import { clamp, formatTimestamp } from './time';
import type { PlayerElements } from './app-shell';
import type { DemoVideo } from './video-library';

interface PlayerControllerOptions {
  elements: PlayerElements;
  videos: DemoVideo[];
  windowObject?: Window;
}

interface SourceState {
  id: string;
  title: string;
  src: string;
  width?: number;
  height?: number;
  durationSeconds: number;
  fps: number;
  note: string;
  kind: 'demo' | 'local';
}

export class VideoPlayerController {
  private readonly elements: PlayerElements;

  private readonly windowObject: Window;

  private readonly byId: Map<string, SourceState>;

  private activeSource: SourceState;

  private dragActive = false;

  private resumeAfterDrag = false;

  private objectUrl?: string;

  constructor({ elements, videos, windowObject = window }: PlayerControllerOptions) {
    if (!videos.length) {
      throw new Error('At least one demo video is required.');
    }

    this.elements = elements;
    this.windowObject = windowObject;
    this.byId = new Map(videos.map((video) => [video.id, this.toSourceState(video)]));
    this.activeSource = this.toSourceState(videos[0]);
  }

  init(): void {
    this.bindEvents();
    this.attachResizeObserver();
    this.selectVideo(this.activeSource.id);
  }

  selectVideo(id: string): void {
    const selected = this.byId.get(id);

    if (!selected) {
      return;
    }

    this.releaseObjectUrl();
    this.loadSource(selected);
  }

  stop(): void {
    this.elements.video.pause();
    this.elements.video.currentTime = 0;
    this.syncTimeline(0, this.getDuration());
    this.updateFrameReadout(0);
    this.setStatus('Stopped');
  }

  async play(): Promise<void> {
    try {
      await this.elements.video.play();
      this.setStatus('Playing');
    } catch {
      this.setStatus('Playback blocked');
    }
  }

  scrubToRatio(ratio: number): number {
    const duration = this.getDuration();

    if (duration <= 0) {
      this.syncTimeline(0, 0);
      this.updateFrameReadout(0);
      return 0;
    }

    const nextFrame = Math.round(clamp(ratio, 0, 1) * this.getFrameCount(duration));

    return this.scrubToFrame(nextFrame, duration);
  }

  private scrubToFrame(frameNumber: number, duration = this.getDuration()): number {
    const frameCount = this.getFrameCount(duration);
    const snappedFrame = Math.round(clamp(frameNumber, 0, frameCount));
    const nextTime = clamp(snappedFrame / this.activeSource.fps, 0, duration);

    this.elements.video.currentTime = nextTime;
    this.syncTimeline(nextTime, duration);
    this.updateFrameReadout(nextTime);

    return nextTime;
  }

  private bindEvents(): void {
    this.elements.playButton.addEventListener('click', () => {
      void this.play();
    });

    this.elements.stopButton.addEventListener('click', () => {
      this.stop();
    });

    this.elements.openFileButton.addEventListener('click', () => {
      this.elements.fileInput.value = '';
      this.elements.fileInput.click();
    });

    this.elements.fileInput.addEventListener('change', () => {
      const file = this.elements.fileInput.files?.[0];

      if (file) {
        this.openLocalFile(file);
      }
    });

    this.elements.timeline.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.capturePointer(this.elements.timeline, event);
      this.startDrag(event.clientX);
    });

    this.elements.timelineThumb.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.capturePointer(this.elements.timelineThumb, event);
      this.startDrag(event.clientX);
    });

    this.windowObject.addEventListener('pointermove', (event) => {
      if (!this.dragActive) {
        return;
      }

      this.scrubFromClientX(event.clientX);
    });

    this.windowObject.addEventListener('pointerup', (event) => {
      if (!this.dragActive) {
        return;
      }

      this.scrubFromClientX(event.clientX);
      this.finishDrag();
    });

    this.windowObject.addEventListener('pointercancel', () => {
      if (this.dragActive) {
        this.finishDrag();
      }
    });

    this.elements.timeline.addEventListener('keydown', (event) => {
      const duration = this.getDuration();

      if (duration <= 0) {
        return;
      }

      const current = this.elements.video.currentTime;
      const currentFrame = this.getFrameFromTime(current, duration);

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.scrubToFrame(currentFrame + 1, duration);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.scrubToFrame(currentFrame - 1, duration);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        this.scrubToRatio(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        this.scrubToFrame(this.getFrameCount(duration), duration);
      }
    });

    this.elements.video.addEventListener('loadedmetadata', () => {
      const duration = this.getDuration();
      const width = this.elements.video.videoWidth || this.activeSource.width || 0;
      const height = this.elements.video.videoHeight || this.activeSource.height || 0;

      this.setMediaAspect(width, height);
      this.elements.duration.textContent = formatTimestamp(duration);
      this.elements.proofBadge.textContent = `${width} x ${height} / ${duration.toFixed(1)}s`;
      this.syncTimeline(this.elements.video.currentTime, duration);
      this.updateFrameReadout(this.elements.video.currentTime);
      this.setStatus('Ready');
    });

    this.elements.video.addEventListener('timeupdate', () => {
      this.syncTimeline(this.elements.video.currentTime, this.getDuration());
      this.updateFrameReadout(this.elements.video.currentTime);
    });

    this.elements.video.addEventListener('seeked', () => {
      this.syncTimeline(this.elements.video.currentTime, this.getDuration());
      this.updateFrameReadout(this.elements.video.currentTime);
    });

    this.elements.video.addEventListener('play', () => {
      this.setStatus('Playing');
    });

    this.elements.video.addEventListener('pause', () => {
      if (!this.dragActive && this.elements.video.currentTime !== 0) {
        this.setStatus('Paused');
      }
    });

    this.elements.video.addEventListener('ended', () => {
      this.setStatus('Ended');
    });

    this.elements.video.addEventListener('error', () => {
      this.setStatus('Unsupported file');
      this.elements.proofBadge.textContent = 'Unsupported or unreadable file';
      this.elements.noteValue.textContent =
        'The selected file reached the player, but Chromium could not decode it.';
    });

    this.elements.sourceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.videoId;

        if (id) {
          this.selectVideo(id);
        }
      });
    });
  }

  private attachResizeObserver(): void {
    if ('ResizeObserver' in this.windowObject) {
      const observer = new ResizeObserver(() => {
        this.updateViewportLabel();
      });
      observer.observe(this.elements.app);
    }

    this.updateViewportLabel();
    this.windowObject.addEventListener('resize', () => {
      this.updateViewportLabel();
    });
  }

  private updateViewportLabel(): void {
    const { clientWidth, clientHeight } = this.elements.app;
    this.elements.viewportValue.textContent = `${clientWidth} x ${clientHeight}`;
  }

  private startDrag(clientX: number): void {
    this.resumeAfterDrag = !this.elements.video.paused;
    this.dragActive = true;
    this.elements.timeline.classList.add('is-dragging');
    this.elements.video.pause();
    this.setStatus('Scrubbing');
    this.scrubFromClientX(clientX);
  }

  private capturePointer(element: HTMLElement, event: PointerEvent): void {
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }
  }

  private finishDrag(): void {
    this.dragActive = false;
    this.elements.timeline.classList.remove('is-dragging');

    if (this.resumeAfterDrag) {
      void this.play();
      return;
    }

    this.setStatus('Paused');
  }

  private scrubFromClientX(clientX: number): void {
    const rect = this.elements.timeline.getBoundingClientRect();
    const width = rect.width || 1;
    const ratio = clamp((clientX - rect.left) / width, 0, 1);
    this.scrubToRatio(ratio);
  }

  private syncTimeline(currentTime: number, duration: number): void {
    const safeDuration = duration > 0 ? duration : this.activeSource.durationSeconds;
    const progressRatio = safeDuration > 0 ? clamp(currentTime / safeDuration, 0, 1) : 0;
    const percentage = `${(progressRatio * 100).toFixed(2)}%`;
    const frameNumber = this.getFrameFromTime(currentTime, safeDuration);

    this.elements.currentTime.textContent = formatTimestamp(currentTime);
    this.elements.timelineFill.style.width = percentage;
    this.elements.timelineThumb.style.left = percentage;
    this.elements.timeline.setAttribute('aria-valuenow', String(Math.round(progressRatio * 100)));
    this.elements.timeline.setAttribute(
      'aria-valuetext',
      `Frame ${frameNumber}, ${formatTimestamp(currentTime)} of ${formatTimestamp(safeDuration)}`,
    );
    this.elements.timeline.dataset.frameIndex = String(frameNumber);
  }

  private updateFrameReadout(currentTime: number): void {
    const frameNumber = this.getFrameFromTime(currentTime);
    this.elements.frameIndex.textContent = `Frame ${frameNumber}`;
    this.elements.video.dataset.frameIndex = String(frameNumber);
  }

  private setStatus(value: string): void {
    this.elements.statusValue.textContent = value;
  }

  private paintSourceButtons(): void {
    this.elements.sourceButtons.forEach((button) => {
      const isActive = this.activeSource.kind === 'demo' && button.dataset.videoId === this.activeSource.id;
      button.classList.toggle('is-active', isActive);
    });
  }

  private getDuration(): number {
    return Number.isFinite(this.elements.video.duration) && this.elements.video.duration > 0
      ? this.elements.video.duration
      : this.activeSource.durationSeconds;
  }

  private getFrameCount(duration = this.getDuration()): number {
    return Math.max(1, Math.round(duration * this.activeSource.fps));
  }

  private getFrameFromTime(currentTime: number, duration = this.getDuration()): number {
    const frameCount = this.getFrameCount(duration);
    const frameNumber = Math.round(clamp(currentTime, 0, duration) * this.activeSource.fps);

    return Math.round(clamp(frameNumber, 0, frameCount));
  }

  private openLocalFile(file: File): void {
    const type = file.type || this.inferMimeType(file.name);
    const canPlay = type ? this.elements.video.canPlayType(type) : 'maybe';
    const objectUrl = URL.createObjectURL(file);

    this.releaseObjectUrl();
    this.objectUrl = objectUrl;

    this.loadSource({
      id: `local-${file.name}-${file.lastModified}`,
      title: file.name,
      src: objectUrl,
      durationSeconds: 0,
      fps: 30,
      note:
        canPlay === ''
          ? 'The browser may not decode this format, but the file was opened for verification.'
          : 'Local file opened from this computer.',
      kind: 'local',
    });
  }

  private loadSource(source: SourceState): void {
    this.activeSource = source;
    this.resumeAfterDrag = false;
    this.dragActive = false;
    this.elements.video.pause();
    this.elements.video.src = source.src;
    this.elements.video.load();
    this.setMediaAspect(source.width || 1, source.height || 1);
    this.elements.sourceValue.textContent = source.title;
    this.elements.noteValue.textContent = source.note;
    this.elements.proofBadge.textContent =
      source.width && source.height ? `${source.width} x ${source.height} proof clip` : 'Loading local file';
    this.elements.duration.textContent = formatTimestamp(source.durationSeconds);
    this.setStatus('Loading');
    this.syncTimeline(0, source.durationSeconds);
    this.updateFrameReadout(0);
    this.paintSourceButtons();
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }

  private toSourceState(video: DemoVideo): SourceState {
    return {
      ...video,
      kind: 'demo',
    };
  }

  private inferMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'mp4':
      case 'm4v':
      case 'mov':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      default:
        return 'video/*';
    }
  }

  private setMediaAspect(width: number, height: number): void {
    const safeWidth = width > 0 ? width : 1;
    const safeHeight = height > 0 ? height : 1;
    this.elements.videoStage.style.setProperty('--media-aspect-ratio', `${safeWidth} / ${safeHeight}`);
    this.elements.videoStage.style.setProperty('--media-aspect-value', String(safeWidth / safeHeight));
  }
}
