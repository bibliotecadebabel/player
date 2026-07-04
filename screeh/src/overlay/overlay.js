import {
  clampRegionToBounds,
  makeRegionFromDrag
} from "../shared/selectionMath.js";

const boxElement = document.getElementById("selection-box");
const labelElement = document.getElementById("selection-label");
const toolbarElement = document.getElementById("selection-toolbar");
const startButton = document.getElementById("start-recording-button");
const cancelButton = document.getElementById("cancel-button");
const minimumSize = 48;

let region = null;
let dragState = null;
let isArmed = false;

window.setTimeout(() => {
  isArmed = true;
  document.body.dataset.ready = "true";
}, 200);

function viewportBounds() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function renderRegion(nextRegion) {
  region = nextRegion;

  if (!region) {
    boxElement.style.display = "none";
    toolbarElement.classList.add("hidden");
    labelElement.textContent = "waiting";
    return;
  }

  boxElement.style.display = "block";
  boxElement.style.left = `${region.x}px`;
  boxElement.style.top = `${region.y}px`;
  boxElement.style.width = `${region.width}px`;
  boxElement.style.height = `${region.height}px`;
  toolbarElement.classList.remove("hidden");
  labelElement.textContent = `${Math.round(region.width)} x ${Math.round(region.height)} px`;
}

function resizeRegion(originalRegion, startPoint, currentPoint, handle) {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  let left = originalRegion.x;
  let top = originalRegion.y;
  let right = originalRegion.x + originalRegion.width;
  let bottom = originalRegion.y + originalRegion.height;

  if (handle.includes("w")) {
    left += dx;
  }
  if (handle.includes("e")) {
    right += dx;
  }
  if (handle.includes("n")) {
    top += dy;
  }
  if (handle.includes("s")) {
    bottom += dy;
  }

  if (right - left < minimumSize) {
    if (handle.includes("w")) {
      left = right - minimumSize;
    } else {
      right = left + minimumSize;
    }
  }
  if (bottom - top < minimumSize) {
    if (handle.includes("n")) {
      top = bottom - minimumSize;
    } else {
      bottom = top + minimumSize;
    }
  }

  return clampRegionToBounds(
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    },
    viewportBounds(),
    minimumSize
  );
}

function pointFromEvent(event) {
  return {
    x: event.clientX,
    y: event.clientY
  };
}

window.addEventListener("mousedown", event => {
  if (!isArmed) {
    return;
  }

  if (event.target.closest("button") || event.target.classList.contains("handle")) {
    return;
  }

  dragState = {
    mode: "draw",
    startPoint: pointFromEvent(event)
  };
  renderRegion(null);
});

for (const handleElement of boxElement.querySelectorAll(".handle")) {
  handleElement.addEventListener("mousedown", event => {
    event.stopPropagation();
    dragState = {
      mode: "resize",
      handle: event.currentTarget.dataset.handle,
      startPoint: pointFromEvent(event),
      originalRegion: region
    };
  });
}

window.addEventListener("mousemove", event => {
  if (!dragState) {
    return;
  }

  const currentPoint = pointFromEvent(event);
  const nextRegion = dragState.mode === "draw"
    ? clampRegionToBounds(
        makeRegionFromDrag(dragState.startPoint, currentPoint),
        viewportBounds(),
        minimumSize
      )
    : resizeRegion(
        dragState.originalRegion,
        dragState.startPoint,
        currentPoint,
        dragState.handle
      );

  renderRegion(nextRegion);
});

window.addEventListener("mouseup", () => {
  dragState = null;
});

startButton.addEventListener("click", async event => {
  event.stopPropagation();
  if (!region) {
    return;
  }

  startButton.disabled = true;
  labelElement.textContent = "starting recording";

  try {
    await window.screenRecorderApi.completeGlobalSelection({
      region
    });
  } catch (error) {
    startButton.disabled = false;
    labelElement.textContent = `failed: ${error.message}`;
  }
});

cancelButton.addEventListener("click", async event => {
  event.stopPropagation();
  await window.screenRecorderApi.cancelGlobalSelection();
});

window.addEventListener("keydown", async event => {
  if (event.key === "Escape") {
    await window.screenRecorderApi.cancelGlobalSelection();
  }
});
