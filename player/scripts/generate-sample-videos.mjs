import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ffmpeg = 'ffmpeg';
const videos = [
  {
    filename: 'public/videos/square-240-3s.mp4',
    codec: 'mp4',
    size: '240x240',
    duration: 3,
    label: '240x240 / 3s',
    rate: 24,
  },
  {
    filename: 'public/videos/square-360-5s.mp4',
    codec: 'mp4',
    size: '360x360',
    duration: 5,
    label: '360x360 / 5s',
    rate: 24,
  },
  {
    filename: 'public/videos/square-540-8s.mp4',
    codec: 'mp4',
    size: '540x540',
    duration: 8,
    label: '540x540 / 8s',
    rate: 24,
  },
  {
    filename: 'public/videos/square-360-5s.webm',
    codec: 'webm',
    size: '360x360',
    duration: 5,
    label: '360x360 / 5s WEBM',
    rate: 24,
  },
  {
    filename: 'public/videos/wide-640x360-4s.mp4',
    codec: 'mp4',
    size: '640x360',
    duration: 4,
    label: '640x360 / 4s WIDE',
    rate: 24,
  },
  {
    filename: 'public/videos/tall-360x640-4s.mp4',
    codec: 'mp4',
    size: '360x640',
    duration: 4,
    label: '360x640 / 4s TALL',
    rate: 24,
  },
];

for (const video of videos) {
  const target = resolve(video.filename);

  mkdirSync(dirname(target), { recursive: true });

  const drawText = [
    `drawtext=text='${video.label}'`,
    'x=(w-text_w)/2',
    'y=22',
    'fontsize=h/12',
    'fontcolor=white',
    'box=1',
    'boxcolor=0x00000099',
    'boxborderw=10',
  ].join(':');

  const filter = [
    'format=yuv420p',
    'drawgrid=w=40:h=40:t=2:c=white@0.35',
    drawText,
  ].join(',');

  const codecArgs =
    video.codec === 'webm'
      ? ['-c:v', 'libvpx-vp9', '-g', '1', '-b:v', '0', '-crf', '32', '-row-mt', '1']
      : [
          '-c:v',
          'libx264',
          '-g',
          '1',
          '-keyint_min',
          '1',
          '-sc_threshold',
          '0',
          '-preset',
          'veryfast',
          '-tune',
          'zerolatency',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
        ];

  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `testsrc2=size=${video.size}:rate=${video.rate}:duration=${video.duration}`,
      '-vf',
      filter,
      '-an',
      ...codecArgs,
      target,
    ],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while generating ${video.filename}`);
  }
}
