import { startStage } from "./stage.js";

const recordButton = document.getElementById("record-button");
const stopButton = document.getElementById("stop-button");
const openOutputButton = document.getElementById("open-output-button");
const captureSurface = document.getElementById("capture-surface");
const overlay = document.getElementById("selection-overlay");
const squareElement = document.getElementById("selection-square");
const modeLabel = document.getElementById("mode-label");
const selectionLabel = document.getElementById("selection-label");
const lastOutputPath = document.getElementById("last-output-path");
const eventLog = document.getElementById("event-log");
const stageCanvas = document.getElementById("stage-canvas");

const state = {
  mode: "idle",
  lastSelection: null,
  lastOutputPath: null
};

function setMode(mode) {
  state.mode = mode;
  modeLabel.textContent = mode;
  recordButton.disabled = mode === "selecting" || mode === "recording";
  stopButton.disabled = mode !== "recording";
}

function appendEvent(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  eventLog.prepend(item);
}

function getSurfaceBounds() {
  const bounds = captureSurface.getBoundingClientRect();
  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height
  };
}

recordButton.addEventListener("click", async () => {
  try {
    setMode("selecting");
    appendEvent("Global selection mode enabled. Main window hidden until recording stops.");
    await window.screenRecorderApi.beginSelection();
  } catch (error) {
    appendEvent(`Selection failed to start: ${error.message}`);
    setMode("idle");
  }
});

stopButton.addEventListener("click", async () => {
  try {
    const result = await window.screenRecorderApi.stopRecording();
    if (result.stopped) {
      setMode("idle");
      lastOutputPath.textContent = result.outputPath;
      appendEvent(`Recording stopped -> ${result.outputPath}`);
      return;
    }

    appendEvent("Stop requested while recorder was idle.");
  } catch (error) {
    setMode("idle");
    appendEvent(`Recording failed to stop cleanly: ${error.message}`);
  }
});

openOutputButton.addEventListener("click", async () => {
  const artifactPath = await window.screenRecorderApi.openArtifactRoot();
  appendEvent(`Opened output folder ${artifactPath}`);
});

window.screenRecorderApi.onRecordingStarted(result => {
  const region = result.region ?? result.square;
  state.lastSelection = region;
  state.lastOutputPath = result.outputPath;
  selectionLabel.textContent = `${Math.round(region.width)} x ${Math.round(region.height)} screen region`;
  lastOutputPath.textContent = result.outputPath;
  setMode("recording");
  appendEvent(`Recording started outside the main window -> ${result.outputPath}`);
});

window.screenRecorderApi.onRecordingStopped(result => {
  setMode("idle");
  if (result.outputPath) {
    state.lastOutputPath = result.outputPath;
    lastOutputPath.textContent = result.outputPath;
    appendEvent(`Recording stopped -> ${result.outputPath}`);
  }
});

window.screenRecorderApi.onSelectionCancelled(() => {
  setMode("idle");
  appendEvent("Selection cancelled.");
});

startStage(stageCanvas);
appendEvent("App ready.");
