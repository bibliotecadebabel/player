const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("screenRecorderApi", {
  getContentBounds: () => ipcRenderer.invoke("window:get-content-bounds"),
  beginSelection: () => ipcRenderer.invoke("selection:begin"),
  completeGlobalSelection: payload => ipcRenderer.invoke("selection:complete", payload),
  cancelGlobalSelection: () => ipcRenderer.invoke("selection:cancel"),
  startRecording: payload => ipcRenderer.invoke("recording:start", payload),
  stopRecording: () => ipcRenderer.invoke("recording:stop"),
  getArtifactRoot: () => ipcRenderer.invoke("artifacts:root"),
  openArtifactRoot: () => ipcRenderer.invoke("artifacts:open"),
  onRecordingStarted: callback => {
    ipcRenderer.on("recording:started", (_event, payload) => callback(payload));
  },
  onRecordingStopped: callback => {
    ipcRenderer.on("recording:stopped", (_event, payload) => callback(payload));
  },
  onSelectionCancelled: callback => {
    ipcRenderer.on("selection:cancelled", () => callback());
  }
});
