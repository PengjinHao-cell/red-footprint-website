import { describe, expect, it } from 'vitest';

import { getMarkerPresentation } from './markerPresentation';

describe('getMarkerPresentation', () => {
  it('keeps the overview offset and base scale when zoomed out', () => {
    expect(
      getMarkerPresentation({
        altitude: 0.65,
        overviewAltitude: 0.65,
        precisionAltitude: 0.35,
        baseOffset: { x: 28, y: -28 },
      }),
    ).toEqual({ offset: { x: 28, y: -28 }, scale: 1 });
  });

  it('returns to the exact anchor and clamps the maximum scale', () => {
    expect(
      getMarkerPresentation({
        altitude: 0.2,
        overviewAltitude: 0.65,
        precisionAltitude: 0.35,
        baseOffset: { x: 28, y: -28 },
      }),
    ).toEqual({ offset: { x: 0, y: 0 }, scale: 1.45 });
  });

  it('interpolates offset and scale between overview and precision zoom', () => {
    const result = getMarkerPresentation({
      altitude: 0.5,
      overviewAltitude: 0.65,
      precisionAltitude: 0.35,
      baseOffset: { x: 28, y: -28 },
    });

    expect(result.scale).toBeCloseTo(1.225);
    expect(result.offset.x).toBeCloseTo(14);
    expect(result.offset.y).toBeCloseTo(-14);
  });

  it('stops growing and stays anchored once precision zoom is exceeded', () => {
    expect(
      getMarkerPresentation({
        altitude: 0.05,
        overviewAltitude: 0.65,
        precisionAltitude: 0.35,
        baseOffset: { x: 28, y: -28 },
      }),
    ).toEqual({ offset: { x: 0, y: 0 }, scale: 1.45 });
  });
});
