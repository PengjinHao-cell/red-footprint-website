import { describe, expect, it } from 'vitest';

import { layoutNearbyMarkers } from './markerLayout';

describe('layoutNearbyMarkers', () => {
  it('gives every marker a stable visual offset while preserving its anchor', () => {
    const result = layoutNearbyMarkers([
      { id: 'a', lat: 31.220104, lng: 121.475407 },
      { id: 'b', lat: 31.24034, lng: 121.471104 },
    ]);

    expect(result).toHaveLength(2);
    expect(result.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(result[0].anchor).toEqual({ lat: 31.220104, lng: 121.475407 });
    expect(result[1].anchor).toEqual({ lat: 31.24034, lng: 121.471104 });
    expect(result[0].offset).not.toEqual(result[1].offset);
  });
});
