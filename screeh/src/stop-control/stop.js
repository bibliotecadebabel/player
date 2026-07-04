const stopButton = document.getElementById("stop-button");
const statusElement = document.getElementById("stop-status");

stopButton.addEventListener("click", async () => {
  stopButton.disabled = true;
  statusElement.textContent = "stopping";

  try {
    const result = await window.screenRecorderApi.stopRecording();
    statusElement.textContent = result.error ? result.error : "stopped";
  } catch (error) {
    stopButton.disabled = false;
    statusElement.textContent = error.message;
  }
});
