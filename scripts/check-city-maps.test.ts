import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

type CityMapManifest = {
  cities: Array<{
    id: string;
    reviewNumber: string;
    sha256: string;
    controlPoints: unknown[];
  }>;
};

describe('city map resource gate', () => {
  it('archives four reviewed maps with traceable calibration evidence', () => {
    const manifest = JSON.parse(
      readFileSync('src/data/maps/cities/city-map-sources.json', 'utf8'),
    ) as CityMapManifest;

    expect(manifest.cities.map(({ id }) => id).sort()).toEqual([
      'nanjing',
      'shanghai',
      'suqian',
      'yangzhou',
    ]);

    for (const city of manifest.cities) {
      expect(city.reviewNumber).toMatch(/\S+/);
      expect(city.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(city.controlPoints.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('passes the executable city-map integrity gate', () => {
    const result = spawnSync('node', ['scripts/check-city-maps.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(`${result.stdout}${result.stderr}`).toMatch(/4 city maps passed/i);
    expect(result.status).toBe(0);
  });
});
