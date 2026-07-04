import './styles.css';
import { createPlayerElements } from './app-shell';
import { VideoPlayerController } from './player-controller';
import { demoVideos } from './video-library';

const container = document.querySelector<HTMLElement>('#app');

if (!container) {
  throw new Error('App container was not found.');
}

const elements = createPlayerElements(container, demoVideos);
const controller = new VideoPlayerController({
  elements,
  videos: demoVideos,
});

controller.init();
