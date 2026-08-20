import { describe, expect, it } from 'vitest';

import { createValidEightSites, validEightSites } from '../test/fixtures/sites';
import { loadSites } from './loadSites';

describe('loadSites', () => {
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

  it('rejects fewer than three photos', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], photos: sites[0].photos.slice(0, 2) };

    expect(() => loadSites(sites)).toThrow();
  });

  it('rejects more than five photos', () => {
    const sites = createValidEightSites();
    sites[0] = {
      ...sites[0],
      photos: [
        ...sites[0].photos,
        '/synthetic/extra/photo-04.jpg',
        '/synthetic/extra/photo-05.jpg',
        '/synthetic/extra/photo-06.jpg',
      ],
    };

    expect(() => loadSites(sites)).toThrow();
  });

  it('rejects a province outside Jiangsu and Shanghai', () => {
    const sites = createValidEightSites();
    sites[0] = { ...sites[0], province: '浙江省' };

    expect(() => loadSites(sites)).toThrow();
  });
});
