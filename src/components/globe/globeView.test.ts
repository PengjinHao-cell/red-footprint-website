import { describe, expect, it } from 'vitest';

import { getYangtzeDeltaOverview } from './globeView';

describe('getYangtzeDeltaOverview', () => {
  it('centres desktop on the Yangtze River Delta at close range', () => {
    expect(getYangtzeDeltaOverview(1440)).toEqual({
      lat: 32,
      lng: 120,
      altitude: 0.65,
    });
  });

  it('backs away on narrow screens without returning to a China overview', () => {
    expect(getYangtzeDeltaOverview(390)).toEqual({
      lat: 32,
      lng: 120,
      altitude: 0.9,
    });
    expect(getYangtzeDeltaOverview(768).altitude).toBe(0.78);
  });
});
