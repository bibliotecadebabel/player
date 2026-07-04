import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, screen, shell } from "electron";

import { RecorderService } from "./recording/recorderService.js";
import { ensureArtifactDirectories, getArtifactRoot } from "./recording/paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererRoot = path.join(__dirname, "..", "renderer");
const overlayRoot = path.join(__dirname, "..", "overlay");
const stopRoot = path.join(__dirname, "..", "stop-control");
const testTargetRoot = path.join(__dirname, "..", "test-target");
const artifactRoot = getArtifactRoot();

let mainWindow = null;
let overlayWindow = null;
let stopWindow = null;
let testTargetWindow = null;
const recorderService = new RecorderService({ artifactRoot });

function createWindow() {
  ensureArtifactDirectories();
  const workArea = screen.getPrimaryDisplay().workArea;
  const testWindowBounds = process.env.SCREENREC_TEST_MODE
    ? {
        width: Math.min(560, workArea.width),
        height: Math.min(780, workArea.height),
        x: Math.max(workArea.x, workArea.x + workArea.width - 600),
        y: workArea.y + 40
      }
    : {};

  mainWindow = new BrowserWindow({
    width: testWindowBounds.width ?? 1280,
    height: testWindowBounds.height ?? 920,
    x: testWindowBounds.x,
    y: testWindowBounds.y,
    backgroundColor: "#101418",
    title: "Bounding Box Screen Recorder",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(rendererRoot, "index.html"));
}

function createTestTargetWindow() {
  if (!process.env.SCREENREC_SHOW_TEST_TARGET || testTargetWindow) {
    return;
  }

  const workArea = screen.getPrimaryDisplay().workArea;
  testTargetWindow = new BrowserWindow({
    width: Math.min(640, Math.max(420, workArea.width - 700)),
    height: Math.min(520, Math.max(360, workArea.height - 160)),
    x: workArea.x + 60,
    y: workArea.y + 80,
    backgroundColor: "#061017",
    title: "External Recording Target",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  testTargetWindow.loadFile(path.join(testTargetRoot, "index.html"));
  testTargetWindow.on("closed", () => {
    testTargetWindow = null;
  });
}

function normalizeOverlayRegion(region, overlayBounds) {
  const display = screen.getDisplayMatching(overlayBounds);
  const scaleFactor = display.scaleFactor;
  const width = Math.max(2, Math.round(region.width * scaleFactor));
  const height = Math.max(2, Math.round(region.height * scaleFactor));
  const evenWidth = width % 2 === 0 ? width : width - 1;
  const evenHeight = height % 2 === 0 ? height : height - 1;

  return {
    x: Math.round((overlayBounds.x + region.x) * scaleFactor),
    y: Math.round((overlayBounds.y + region.y) * scaleFactor),
    width: Math.max(2, evenWidth),
    height: Math.max(2, evenHeight)
  };
}

function closeOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
}

function createOverlayWindow() {
  closeOverlayWindow();
  const display = screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    ...display.bounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: "Square Recorder Selection Overlay",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile(path.join(overlayRoot, "index.html"));
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function rectanglesOverlap(first, second) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

function chooseStopWindowBounds(screenRegion) {
  const display = screen.getDisplayNearestPoint({
    x: screenRegion.x,
    y: screenRegion.y
  });
  const scaleFactor = display.scaleFactor;
  const workArea = display.workArea;
  const margin = 18;
  const width = 240;
  const height = 92;
  const selectedArea = {
    x: screenRegion.x / scaleFactor,
    y: screenRegion.y / scaleFactor,
    width: screenRegion.width / scaleFactor,
    height: screenRegion.height / scaleFactor
  };
  const candidates = [
    { x: workArea.x + margin, y: workArea.y + margin },
    { x: workArea.x + workArea.width - width - margin, y: workArea.y + margin },
    { x: workArea.x + margin, y: workArea.y + workArea.height - height - margin },
    {
      x: workArea.x + workArea.width - width - margin,
      y: workArea.y + workArea.height - height - margin
    }
  ];
  const available = candidates.find(candidate =>
    !rectanglesOverlap({ ...candidate, width, height }, selectedArea)
  );

  return {
    ...(available ?? candidates[3]),
    width,
    height
  };
}

function createStopWindow(screenRegion) {
  if (stopWindow && !stopWindow.isDestroyed()) {
    stopWindow.close();
  }

  stopWindow = new BrowserWindow({
    ...chooseStopWindowBounds(screenRegion),
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: "Square Recorder Stop Control",
    backgroundColor: "#101418",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  stopWindow.setAlwaysOnTop(true, "screen-saver");
  stopWindow.loadFile(path.join(stopRoot, "index.html"));
  stopWindow.on("closed", () => {
    stopWindow = null;
  });
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

async function stopRecordingFromAnyWindow() {
  try {
    const result = await recorderService.stop();
    if (stopWindow && !stopWindow.isDestroyed()) {
      stopWindow.close();
    }
    showMainWindow();
    mainWindow?.webContents.send("recording:stopped", result);
    return result;
  } catch (error) {
    if (stopWindow && !stopWindow.isDestroyed()) {
      stopWindow.close();
    }
    showMainWindow();
    mainWindow?.webContents.send("recording:stopped", {
      stopped: false,
      error: error.message
    });
    return {
      stopped: false,
      error: error.message
    };
  }
}

app.whenReady().then(() => {
  createWindow();
  createTestTargetWindow();

  ipcMain.handle("window:get-content-bounds", () => {
    const contentBounds = mainWindow.getContentBounds();
    const display = screen.getDisplayMatching(contentBounds);
    return {
      ...contentBounds,
      scaleFactor: display.scaleFactor
    };
  });

  ipcMain.handle("recording:start", async (_event, payload) => {
    return recorderService.start(payload);
  });

  ipcMain.handle("recording:stop", async () => {
    return stopRecordingFromAnyWindow();
  });

  ipcMain.handle("selection:begin", async () => {
    if (recorderService.isRecording()) {
      throw new Error("A recording is already in progress.");
    }

    createOverlayWindow();
    mainWindow.hide();

    return {
      status: "selecting"
    };
  });

  ipcMain.handle("selection:cancel", async () => {
    closeOverlayWindow();
    showMainWindow();
    mainWindow?.webContents.send("selection:cancelled");
    return {
      status: "cancelled"
    };
  });

  ipcMain.handle("selection:complete", async (_event, payload) => {
    const overlayBounds = overlayWindow?.getBounds() ?? screen.getPrimaryDisplay().bounds;
    const screenRegion = normalizeOverlayRegion(payload.region ?? payload.square, overlayBounds);

    let result;
    try {
      result = await recorderService.start({
        region: screenRegion,
        label: `region-${screenRegion.width}x${screenRegion.height}`
      });
    } catch (error) {
      showMainWindow();
      mainWindow?.webContents.send("recording:stopped", {
        stopped: false,
        error: error.message
      });
      throw error;
    }

    closeOverlayWindow();
    createStopWindow(screenRegion);
    mainWindow?.webContents.send("recording:started", {
      ...result,
      region: screenRegion
    });

    return {
      ...result,
      region: screenRegion
    };
  });

  ipcMain.handle("artifacts:root", () => artifactRoot);
  ipcMain.handle("artifacts:open", async () => {
    await shell.openPath(artifactRoot);
    return artifactRoot;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
