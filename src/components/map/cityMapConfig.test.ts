import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cityMapConfigs, groupSitesByCity } from './cityMapConfig';

type SiteFixture = {
  id: string;
  city: string;
  coordinates: { lat: number; lng: number };
};

const sites = JSON.parse(readFileSync('src/data/sites.json', 'utf8')) as SiteFixture[];

describe('city map configuration', () => {
  it('groups all eight sites into the expected 3/2/2/1 city split', () => {
    expect(groupSitesByCity(sites)).toEqual({
      nanjing: expect.arrayContaining([
        expect.objectContaining({ id: 'yuhuatai-martyrs' }),
        expect.objectContaining({ id: 'dujiang-victory' }),
        expect.objectContaining({ id: 'meiyuan-new-village' }),
      ]),
      shanghai: expect.arrayContaining([
        expect.objectContaining({ id: 'sihang-warehouse' }),
        expect.objectContaining({ id: 'cpc-first-congress' }),
      ]),
      yangzhou: expect.arrayContaining([
        expect.objectContaining({ id: 'jiangshangqing-memorial' }),
        expect.objectContaining({ id: 'yangzhou-martyrs' }),
      ]),
      suqian: [expect.objectContaining({ id: 'sihong-memorial' })],
    });
  });

  it('exposes four image-backed affine calibrations', () => {
    expect(Object.keys(cityMapConfigs).sort()).toEqual([
      'nanjing',
      'shanghai',
      'suqian',
      'yangzhou',
    ]);
    for (const config of Object.values(cityMapConfigs)) {
      expect(config.imageUrl).toMatch(/\.jpg$/);
      expect(config.reviewNumber).toMatch(/\S+/);
      expect(config.projection.kind).toBe('affine');
      expect(config.projection.controlPoints).toHaveLength(4);
    }
  });
});
