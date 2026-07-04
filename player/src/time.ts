export const clamp = (value: number, min = 0, max = 1): number => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
};

export const formatTimestamp = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.000';
  }

  const wholeMinutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(wholeMinutes).padStart(2, '0')}:${String(wholeSeconds).padStart(
    2,
    '0',
  )}.${String(milliseconds).padStart(3, '0')}`;
};

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 'Unknown length';
  }

  return `${seconds.toFixed(1)}s`;
};
