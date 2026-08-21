import { describe, expect, it } from 'vitest';

import { siteSchema } from '../data/siteSchema';
import { createValidEightSites } from '../test/fixtures/sites';
import { buildMediaItems } from './media';

describe('buildMediaItems', () => {
  it('places the only video before every selected photo', () => {
    const site = siteSchema.parse(createValidEightSites()[0]);
    const items = buildMediaItems(site);

    expect(items.map((item) => item.type)).toEqual([
      'video',
      'image',
      'image',
      'image',
    ]);
    expect(items[0]).toMatchObject({
      type: 'video',
      src: site.video.url,
      poster: site.video.poster,
      captions: site.video.captions,
    });
  });

  it('preserves photo order and reviewed alt text', () => {
    const site = siteSchema.parse(createValidEightSites()[0]);
    const items = buildMediaItems(site);

    expect(items.slice(1)).toEqual(
      site.photos.map((photo) => ({
        type: 'image',
        src: photo.src,
        alt: photo.alt,
      })),
    );
  });
});
