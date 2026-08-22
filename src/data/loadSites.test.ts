import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createValidEightSites, validEightSites } from '../test/fixtures/sites';
import { loadSites } from './loadSites';

describe('loadSites', () => {
  it('loads the generated production collection through the production schema', async () => {
    const sitesPath = join(process.cwd(), 'src/data/sites.json');

    expect(existsSync(sitesPath)).toBe(true);
    if (!existsSync(sitesPath)) return;

    const schemaModule = await import('./siteSchema');
    const productionSiteSchema = Reflect.get(
      schemaModule,
      'productionSiteSchema',
    );
    expect(productionSiteSchema).toBeDefined();
    if (!productionSiteSchema) return;

    const input: unknown = JSON.parse(readFileSync(sitesPath, 'utf8'));
    const sites = loadSites(input);

    expect(sites).toHaveLength(8);
    sites.forEach((site) => {
      expect(productionSiteSchema.safeParse(site).success).toBe(true);
      expect(site).toMatchObject({
        coordinateSystem: 'GCJ-02',
        mediaDelivery: { status: 'reconciled-production' },
      });
    });
  });

  it('accepts eight complete synthetic site records', () => {
    expect(loadSites(validEightSites)).toHaveLength(8);
  });

  it('rejects a collection containing only seven sites', () => {
    expect(() => loadSites(validEightSites.slice(0, 7))).toThrow(
      /exactly 8 sites/i,
    );
  });

  it('rejects duplicate official site names', () => {
    const sites = createValidEightSites();
    sites[1] = { ...sites[1], officialName: sites[0].officialName };

    expect(() => loadSites(sites)).toThrow(/unique officialName/i);
  });

  it('rejects duplicate site IDs', () => {
    const sites = createValidEightSites();
    sites[1] = { ...sites[1], id: sites[0].id };

    expect(() => loadSites(sites)).toThrow(/unique id/i);
  });

  it('rejects an HTTP video URL', () => {
    const sites = createValidEightSites();
    sites[0] = {
      ...sites[0],
      video: { ...sites[0].video, url: 'http://media.invalid/video.mp4' },
    };

    expect(() => loadSites(sites)).toThrow();
  });

  it('rejects an empty authoritative-source collection', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], sources: [] };

    expect(() => loadSites(sites)).toThrow();
  });

  it('accepts a site containing one selected photo', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], photos: sites[0].photos.slice(0, 1) };

    expect(loadSites(sites)).toHaveLength(8);
  });

  it('rejects a site containing no selected photos', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], photos: [] };

    expect(() => loadSites(sites)).toThrow();
  });

  it('accepts a site containing five selected photos', () => {
    const sites = createValidEightSites();
    const selectedPhoto = sites[0].photos[0];
    sites[0] = {
      ...sites[0],
      photos: [...sites[0].photos, selectedPhoto, selectedPhoto],
    };

    expect(loadSites(sites)).toHaveLength(8);
  });

  it('rejects a site containing six selected photos', () => {
    const sites = createValidEightSites();
    const selectedPhoto = sites[0].photos[0];
    sites[0] = {
      ...sites[0],
      photos: [
        ...sites[0].photos,
        selectedPhoto,
        selectedPhoto,
        selectedPhoto,
      ],
    };

    expect(() => loadSites(sites)).toThrow();
  });

  it('rejects a selected photo without alt text', () => {
    const sites = createValidEightSites();
    const sitesWithMissingAlt = sites.map((site, index) =>
      index === 0
        ? {
            ...site,
            photos: [{ src: '/synthetic/missing-alt.jpg' }],
          }
        : site,
    );

    expect(() => loadSites(sitesWithMissingAlt)).toThrow();
  });

  it('rejects a selected photo with empty alt text', () => {
    const sites = createValidEightSites();
    const sitesWithEmptyAlt = sites.map((site, index) =>
      index === 0
        ? {
            ...site,
            photos: [{ src: '/synthetic/empty-alt.jpg', alt: '' }],
          }
        : site,
    );

    expect(() => loadSites(sitesWithEmptyAlt)).toThrow();
  });

  it('rejects a province outside Jiangsu and Shanghai', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], province: '浙江省' };

    expect(() => loadSites(sites)).toThrow();
  });
});
