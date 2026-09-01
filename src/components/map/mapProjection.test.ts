import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cityMapConfigs, cityIdForSite } from './cityMapConfig';
import {
  calculateAffineDiagnostics,
  projectCoordinate,
} from './mapProjection';

type SiteFixture = {
  id: string;
  city: string;
  coordinates: { lat: number; lng: number };
};

const sites = JSON.parse(readFileSync('src/data/sites.json', 'utf8')) as SiteFixture[];

describe('city map projection', () => {
  it('projects the center of linear geographic bounds', () => {
    expect(
      projectCoordinate(
        { lat: 32, lng: 119 },
        { kind: 'bounds', north: 33, south: 31, east: 120, west: 118 },
        { width: 1000, height: 800 },
      ),
    ).toEqual({ x: 500, y: 400 });
  });

  it('rejects invalid projection parameters', () => {
    expect(() =>
      projectCoordinate(
        { lat: 32, lng: 119 },
        { kind: 'bounds', north: 32, south: 32, east: 120, west: 118 },
        { width: 1000, height: 800 },
      ),
    ).toThrow('Invalid city-map projection parameters');
  });

  it('reports finite residual and leave-one-out diagnostics for every city', () => {
    for (const config of Object.values(cityMapConfigs)) {
      const diagnostics = calculateAffineDiagnostics(config.projection.controlPoints);
      expect(diagnostics.rmsResidualPixels).toBeGreaterThanOrEqual(0);
      expect(diagnostics.maxResidualPixels).toBeLessThan(40);
      expect(diagnostics.maxLeaveOneOutPixels).toBeGreaterThan(0);
      expect(Number.isFinite(diagnostics.maxLeaveOneOutPixels)).toBe(true);
    }
  });

  it('projects all eight production sites inside their city images', () => {
    for (const site of sites) {
      const cityId = cityIdForSite(site);
      const config = cityMapConfigs[cityId];
      const point = projectCoordinate(site.coordinates, config.projection, config.viewBox);
      expect(Number.isFinite(point.x), site.id).toBe(true);
      expect(Number.isFinite(point.y), site.id).toBe(true);
      expect(point.x, site.id).toBeGreaterThanOrEqual(0);
      expect(point.x, site.id).toBeLessThanOrEqual(config.viewBox.width);
      expect(point.y, site.id).toBeGreaterThanOrEqual(0);
      expect(point.y, site.id).toBeLessThanOrEqual(config.viewBox.height);
    }
  });
});
