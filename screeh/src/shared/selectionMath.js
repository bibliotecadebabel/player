const DEFAULT_MIN_SIZE = 48;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function makeSquareFromDrag(startPoint, currentPoint) {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  const directionX = dx >= 0 ? 1 : -1;
  const directionY = dy >= 0 ? 1 : -1;

  return {
    x: directionX === 1 ? startPoint.x : startPoint.x - size,
    y: directionY === 1 ? startPoint.y : startPoint.y - size,
    size
  };
}

export function makeRegionFromDrag(startPoint, currentPoint) {
  return {
    x: Math.min(startPoint.x, currentPoint.x),
    y: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y)
  };
}

export function clampSquareToBounds(square, bounds, minimumSize = DEFAULT_MIN_SIZE) {
  const safeMinimum = Math.max(2, minimumSize);
  const maxSize = Math.max(safeMinimum, Math.min(bounds.width, bounds.height));
  const candidateSize = clamp(square.size, safeMinimum, maxSize);
  const evenSize = candidateSize % 2 === 0 ? candidateSize : candidateSize - 1;
  const size = Math.max(2, evenSize);

  return {
    x: clamp(square.x, 0, Math.max(0, bounds.width - size)),
    y: clamp(square.y, 0, Math.max(0, bounds.height - size)),
    size
  };
}

export function clampRegionToBounds(region, bounds, minimumSize = DEFAULT_MIN_SIZE) {
  const safeMinimum = Math.max(2, minimumSize);
  const candidateWidth = clamp(region.width, safeMinimum, Math.max(safeMinimum, bounds.width));
  const candidateHeight = clamp(region.height, safeMinimum, Math.max(safeMinimum, bounds.height));
  const width = Math.max(2, candidateWidth % 2 === 0 ? candidateWidth : candidateWidth - 1);
  const height = Math.max(2, candidateHeight % 2 === 0 ? candidateHeight : candidateHeight - 1);

  return {
    x: clamp(region.x, 0, Math.max(0, bounds.width - width)),
    y: clamp(region.y, 0, Math.max(0, bounds.height - height)),
    width,
    height
  };
}

export function squareIsValid(square, minimumSize = DEFAULT_MIN_SIZE) {
  return Boolean(square) && square.size >= minimumSize;
}

export function regionIsValid(region, minimumSize = DEFAULT_MIN_SIZE) {
  return Boolean(region) && region.width >= minimumSize && region.height >= minimumSize;
}

export function toScreenSquare(viewportSquare, contentBounds, scaleFactor) {
  return {
    x: Math.round((contentBounds.x + viewportSquare.x) * scaleFactor),
    y: Math.round((contentBounds.y + viewportSquare.y) * scaleFactor),
    size: Math.round(viewportSquare.size * scaleFactor)
  };
}

export function toScreenRegion(viewportRegion, contentBounds, scaleFactor) {
  return {
    x: Math.round((contentBounds.x + viewportRegion.x) * scaleFactor),
    y: Math.round((contentBounds.y + viewportRegion.y) * scaleFactor),
    width: Math.round(viewportRegion.width * scaleFactor),
    height: Math.round(viewportRegion.height * scaleFactor)
  };
}

export function normalizeCaptureSquare(viewportSquare, viewportBounds, contentBounds, scaleFactor, minimumSize = DEFAULT_MIN_SIZE) {
  const clampedViewportSquare = clampSquareToBounds(viewportSquare, viewportBounds, minimumSize);
  const screenSquare = toScreenSquare(clampedViewportSquare, contentBounds, scaleFactor);
  const normalizedScreenSquare = clampSquareToBounds(
    screenSquare,
    {
      width: Math.round(viewportBounds.width * scaleFactor),
      height: Math.round(viewportBounds.height * scaleFactor)
    },
    minimumSize
  );

  return {
    viewportSquare: clampedViewportSquare,
    screenSquare: normalizedScreenSquare
  };
}

export function normalizeCaptureRegion(viewportRegion, viewportBounds, contentBounds, scaleFactor, minimumSize = DEFAULT_MIN_SIZE) {
  const clampedViewportRegion = clampRegionToBounds(viewportRegion, viewportBounds, minimumSize);
  const screenRegion = toScreenRegion(clampedViewportRegion, contentBounds, scaleFactor);
  const normalizedScreenRegion = clampRegionToBounds(
    screenRegion,
    {
      width: Math.round(viewportBounds.width * scaleFactor),
      height: Math.round(viewportBounds.height * scaleFactor)
    },
    minimumSize
  );

  return {
    viewportRegion: clampedViewportRegion,
    screenRegion: normalizedScreenRegion
  };
}

export const selectionMathDefaults = {
  DEFAULT_MIN_SIZE
};
