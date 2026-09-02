import { describe, expect, it } from 'vitest';

import { nearestSiteId } from './nearestSite';

type Candidate = { id: string; x: number; y: number };

describe('nearestSiteId', () => {
  it('returns the nearest candidate within the hit radius', () => {
    const candidates: Candidate[] = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 30, y: 0 },
      { id: 'c', x: 100, y: 0 },
    ];

    expect(nearestSiteId(candidates, 20, 0, 24)).toBe('b');
    expect(nearestSiteId(candidates, 0, 0, 24)).toBe('a');
  });

  it('returns null when no candidate is within the hit radius', () => {
    const candidates: Candidate[] = [{ id: 'a', x: 0, y: 0 }];

    expect(nearestSiteId(candidates, 100, 100, 24)).toBeNull();
  });

  it('returns null for an empty candidate list', () => {
    expect(nearestSiteId([], 10, 10, 24)).toBeNull();
  });

  it('breaks exact ties by picking the first candidate', () => {
    const candidates: Candidate[] = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 0, y: 0 },
    ];

    expect(nearestSiteId(candidates, 5, 0, 24)).toBe('a');
  });
});
