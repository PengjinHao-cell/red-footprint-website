import { describe, expect, it } from 'vitest';

import {
  clampScale,
  MAX_CITY_SCALE,
  MIN_CITY_SCALE,
  resetViewport,
  zoomAtPoint,
  type CityMapViewportState,
} from './cityMapViewport';

describe('cityMapViewport', () => {
  it('exposes a 1—2.5 scale range and clamps into it', () => {
    expect(MIN_CITY_SCALE).toBe(1);
    expect(MAX_CITY_SCALE).toBe(2.5);
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(1)).toBe(1);
    expect(clampScale(1.6)).toBe(1.6);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(9)).toBe(2.5);
  });

  it('zooms in around an anchor without moving the anchor on screen', () => {
    const initial: CityMapViewportState = { scale: 1, translateX: 0, translateY: 0 };
    const anchor = { x: 200, y: 120 };
    const next = zoomAtPoint(initial, anchor.x, anchor.y, 2);

    expect(next.scale).toBe(2);
    expect(anchor.x * next.scale + next.translateX).toBeCloseTo(
      anchor.x * initial.scale + initial.translateX,
    );
    expect(anchor.y * next.scale + next.translateY).toBeCloseTo(
      anchor.y * initial.scale + initial.translateY,
    );
  });

  it('zooms out around the same anchor and returns to the reset state', () => {
    const zoomed: CityMapViewportState = { scale: 2, translateX: -200, translateY: -120 };
    const next = zoomAtPoint(zoomed, 200, 120, 1);

    expect(next).toEqual(resetViewport());
  });

  it('does not drift the translation when the requested scale clamps to the current one', () => {
    const state: CityMapViewportState = { scale: 1, translateX: 10, translateY: 5 };
    const next = zoomAtPoint(state, 50, 50, 0.5);

    expect(next.scale).toBe(1);
    expect(next.translateX).toBe(10);
    expect(next.translateY).toBe(5);
  });

  it('resets to scale 1 and zero translation', () => {
    expect(resetViewport()).toEqual({ scale: 1, translateX: 0, translateY: 0 });
  });

  it('returns a new object and never mutates the input state', () => {
    const state: CityMapViewportState = { scale: 1, translateX: 0, translateY: 0 };
    const next = zoomAtPoint(state, 100, 100, 2);

    expect(next).not.toBe(state);
    expect(state).toEqual({ scale: 1, translateX: 0, translateY: 0 });
  });
});
