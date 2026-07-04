export function buildRecordingArgs({ region, square, fps, outputPath }) {
  const captureRegion = region ?? square;
  const width = captureRegion.width ?? captureRegion.size;
  const height = captureRegion.height ?? captureRegion.size;

  return [
    "-y",
    "-f",
    "gdigrab",
    "-framerate",
    String(fps),
    "-offset_x",
    String(captureRegion.x),
    "-offset_y",
    String(captureRegion.y),
    "-video_size",
    `${width}x${height}`,
    "-draw_mouse",
    "0",
    "-i",
    "desktop",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath
  ];
}
