import { describe, expect, it } from 'vitest';
import { clamp, formatDuration, formatTimestamp } from '../../src/time';

describe('time helpers', () => {
  it('clamps values into range', () => {
    expect(clamp(-0.4, 0, 1)).toBe(0);
    expect(clamp(0.35, 0, 1)).toBe(0.35);
    expect(clamp(1.4, 0, 1)).toBe(1);
  });

  it('formats timestamps consistently', () => {
    expect(formatTimestamp(0)).toBe('00:00.000');
    expect(formatTimestamp(65.432)).toBe('01:05.432');
    expect(formatTimestamp(Number.NaN)).toBe('00:00.000');
  });

  it('formats durations for metadata badges', () => {
    expect(formatDuration(8)).toBe('8.0s');
    expect(formatDuration(-1)).toBe('Unknown length');
  });
});
