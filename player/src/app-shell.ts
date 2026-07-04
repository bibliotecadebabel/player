import type { DemoVideo } from './video-library';

export interface PlayerElements {
  app: HTMLElement;
  video: HTMLVideoElement;
  playButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  openFileButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  videoStage: HTMLDivElement;
  mediaStack: HTMLDivElement;
  timeline: HTMLDivElement;
  timelineFill: HTMLDivElement;
  timelineThumb: HTMLButtonElement;
  currentTime: HTMLSpanElement;
  duration: HTMLSpanElement;
  frameIndex: HTMLSpanElement;
  proofBadge: HTMLSpanElement;
  statusValue: HTMLSpanElement;
  viewportValue: HTMLSpanElement;
  sourceValue: HTMLHeadingElement;
  noteValue: HTMLParagraphElement;
  sourceButtons: HTMLButtonElement[];
}

const sourceCard = (video: DemoVideo, isActive: boolean): string => `
  <button
    class="source-card${isActive ? ' is-active' : ''}"
    type="button"
    data-video-id="${video.id}"
    data-testid="source-${video.id}"
  >
    <span class="source-card__title">${video.title}</span>
    <span class="source-card__meta">${video.width} x ${video.height} / ${video.durationSeconds}s</span>
    <span class="source-card__note">${video.note}</span>
  </button>
`;

export const appShell = (videos: DemoVideo[]): string => `
  <main class="app-shell" data-testid="player-app">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Frame-Accurate Demo Player</p>
        <h1>Square Proof Player</h1>
        <p class="hero-text">
          Play, stop, drag the thumb to seek frame-by-frame, and resize the window without breaking the stage.
        </p>
      </div>
      <div class="hero-metrics">
        <div class="metric-pill">
          <span class="metric-pill__label">Viewport</span>
          <span id="viewportValue" data-testid="viewport-value">Waiting</span>
        </div>
        <div class="metric-pill">
          <span class="metric-pill__label">Playback</span>
          <span id="statusValue" data-testid="status-value">Idle</span>
        </div>
      </div>
    </section>

    <section class="player-layout">
      <div class="stage-card">
        <div class="stage-card__header">
          <div>
            <p class="eyebrow">Selected Source</p>
            <h2 id="sourceValue" data-testid="source-value">${videos[0]?.title ?? 'No source'}</h2>
          </div>
          <span id="proofBadge" class="proof-badge" data-testid="proof-badge">Awaiting metadata</span>
        </div>

        <div class="video-stage" data-testid="video-stage">
          <div class="media-stack" data-testid="media-stack">
            <video
              id="videoElement"
              class="video-stage__media"
              preload="auto"
              playsinline
              muted
              data-testid="video-element"
            ></video>

            <div class="scrub-dock" data-testid="scrub-dock">
              <div class="scrub-dock__readout">
                <span class="scrub-dock__label">Frame scrubber</span>
                <span class="scrub-dock__time">
                  <span id="currentTimeValue" data-testid="current-time">00:00.000</span>
                  <span class="scrub-dock__divider">/</span>
                  <span id="durationValue" data-testid="duration-value">00:00.000</span>
                </span>
              </div>

              <div
                id="timeline"
                class="timeline"
                role="slider"
                tabindex="0"
                aria-label="Video timeline"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="0"
                data-testid="timeline"
              >
                <div id="timelineFill" class="timeline__fill"></div>
                <button
                  id="timelineThumb"
                  class="timeline__thumb"
                  type="button"
                  aria-label="Hold and drag to scrub frames"
                  data-testid="timeline-thumb"
                ></button>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline-panel">
          <div class="timeline-panel__copy">
            <div>
              <p class="eyebrow">Timeline</p>
              <h3>Hold and drag the bar directly under the video to update frames</h3>
            </div>
          </div>
          <div class="control-row">
            <button id="playButton" class="control-button control-button--play" type="button" data-testid="play-button">
              Play
            </button>
            <button id="stopButton" class="control-button control-button--stop" type="button" data-testid="stop-button">
              Stop
            </button>
            <div class="frame-readout">
              <span class="frame-readout__label">Approx frame</span>
              <span id="frameIndexValue" data-testid="frame-index">Frame 0</span>
            </div>
          </div>
        </div>
      </div>

      <aside class="source-panel">
        <div class="source-panel__header">
          <div>
            <p class="eyebrow">Bundled Evidence Clips</p>
            <h2>Square sources with varied dimensions and lengths</h2>
          </div>
          <div class="source-panel__actions">
            <button
              id="openFileButton"
              class="control-button control-button--open"
              type="button"
              data-testid="open-button"
            >
              Open Video
            </button>
            <input
              id="videoFileInput"
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.ogg,.mov,.m4v"
              hidden
              data-testid="file-input"
            />
            <p class="source-panel__format-copy">
              Open local MP4, WebM, Ogg, MOV, or M4V files when the browser codec is available.
            </p>
          </div>
        </div>
        <p id="noteValue" class="source-panel__note" data-testid="note-value">${videos[0]?.note ?? ''}</p>
        <div class="source-list">
          ${videos.map((video, index) => sourceCard(video, index === 0)).join('')}
        </div>
      </aside>
    </section>
  </main>
`;

const required = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
};

export const createPlayerElements = (container: HTMLElement, videos: DemoVideo[]): PlayerElements => {
  container.innerHTML = appShell(videos);

  const app = required<HTMLElement>(container, '.app-shell');

  return {
    app,
    video: required<HTMLVideoElement>(app, '#videoElement'),
    playButton: required<HTMLButtonElement>(app, '#playButton'),
    stopButton: required<HTMLButtonElement>(app, '#stopButton'),
    openFileButton: required<HTMLButtonElement>(app, '#openFileButton'),
    fileInput: required<HTMLInputElement>(app, '#videoFileInput'),
    videoStage: required<HTMLDivElement>(app, '.video-stage'),
    mediaStack: required<HTMLDivElement>(app, '.media-stack'),
    timeline: required<HTMLDivElement>(app, '#timeline'),
    timelineFill: required<HTMLDivElement>(app, '#timelineFill'),
    timelineThumb: required<HTMLButtonElement>(app, '#timelineThumb'),
    currentTime: required<HTMLSpanElement>(app, '#currentTimeValue'),
    duration: required<HTMLSpanElement>(app, '#durationValue'),
    frameIndex: required<HTMLSpanElement>(app, '#frameIndexValue'),
    proofBadge: required<HTMLSpanElement>(app, '#proofBadge'),
    statusValue: required<HTMLSpanElement>(app, '#statusValue'),
    viewportValue: required<HTMLSpanElement>(app, '#viewportValue'),
    sourceValue: required<HTMLHeadingElement>(app, '#sourceValue'),
    noteValue: required<HTMLParagraphElement>(app, '#noteValue'),
    sourceButtons: Array.from(app.querySelectorAll<HTMLButtonElement>('[data-video-id]')),
  };
};
