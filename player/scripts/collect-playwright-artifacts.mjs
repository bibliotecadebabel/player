import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('output/playwright/test-results');
const targets = {
  videos: resolve('output/playwright/videos'),
  traces: resolve('output/playwright/traces'),
  screenshots: resolve('output/playwright/screenshots'),
};

for (const directory of Object.values(targets)) {
  mkdirSync(directory, { recursive: true });
}

if (!existsSync(root)) {
  process.exit(0);
}

for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const sourceDir = join(root, entry.name);
  const mappings = [
    { filename: 'video.webm', targetDir: targets.videos, extension: '.webm' },
    { filename: 'trace.zip', targetDir: targets.traces, extension: '.zip' },
    { filename: 'test-failed-1.png', targetDir: targets.screenshots, extension: '.png' },
  ];

  for (const mapping of mappings) {
    const source = join(sourceDir, mapping.filename);

    if (!existsSync(source)) {
      continue;
    }

    copyFileSync(source, join(mapping.targetDir, `${entry.name}${mapping.extension}`));
  }
}
