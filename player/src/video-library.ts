export interface DemoVideo {
  id: string;
  title: string;
  src: string;
  width: number;
  height: number;
  durationSeconds: number;
  fps: number;
  note: string;
}

export const demoVideos: DemoVideo[] = [
  {
    id: 'square-240-3s',
    title: 'Square 240',
    src: '/videos/square-240-3s.mp4',
    width: 240,
    height: 240,
    durationSeconds: 3,
    fps: 24,
    note: 'Short clip for quick play-stop verification.',
  },
  {
    id: 'square-360-5s',
    title: 'Square 360',
    src: '/videos/square-360-5s.mp4',
    width: 360,
    height: 360,
    durationSeconds: 5,
    fps: 24,
    note: 'Mid-length clip for drag and frame seeking checks.',
  },
  {
    id: 'square-540-8s',
    title: 'Square 540',
    src: '/videos/square-540-8s.mp4',
    width: 540,
    height: 540,
    durationSeconds: 8,
    fps: 24,
    note: 'Longer clip for repeated resize and adversarial scrubbing.',
  },
  {
    id: 'wide-640-4s',
    title: 'Wide 640 x 360',
    src: '/videos/wide-640x360-4s.mp4',
    width: 640,
    height: 360,
    durationSeconds: 4,
    fps: 24,
    note: 'Wide clip for aspect-ratio layout red teaming.',
  },
  {
    id: 'tall-360-4s',
    title: 'Tall 360 x 640',
    src: '/videos/tall-360x640-4s.mp4',
    width: 360,
    height: 640,
    durationSeconds: 4,
    fps: 24,
    note: 'Tall clip for aspect-ratio layout red teaming.',
  },
];
