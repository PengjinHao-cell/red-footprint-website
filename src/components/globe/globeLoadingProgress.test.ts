import { describe, expect, it } from 'vitest';

import {
  getPendingProgress,
  getReadyProgress,
} from './globeLoadingProgress';

describe('getPendingProgress', () => {
  it('starts at zero, grows monotonically, and clamps at 75', () => {
    expect(getPendingProgress(0)).toBe(0);
    expect(getPendingProgress(700)).toBeGreaterThan(0);
    expect(getPendingProgress(700)).toBeLessThan(75);
    expect(getPendingProgress(1_400)).toBe(75);
    expect(getPendingProgress(8_000)).toBe(75);
  });
});

describe('getReadyProgress', () => {
  it('moves from the pending plateau to 100 within the finishing window', () => {
    expect(getReadyProgress(0)).toBe(75);
    expect(getReadyProgress(175)).toBeGreaterThan(75);
    expect(getReadyProgress(175)).toBeLessThan(100);
    expect(getReadyProgress(350)).toBe(100);
    expect(getReadyProgress(2_000)).toBe(100);
  });
});
