import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { sortSitesForDirectory } from './siteDirectoryOrder';

const productionSites = siteSchema
  .array()
  .parse(
    JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/sites.json'), 'utf8'),
    ),
  );

describe('sortSitesForDirectory', () => {
  it('orders the eight production sites by city pinyin then site pinyin', () => {
    expect(
      sortSitesForDirectory(productionSites).map(({ id }) => id),
    ).toEqual([
      'dujiang-victory',
      'yuhuatai-martyrs',
      'meiyuan-new-village',
      'sihang-warehouse',
      'cpc-first-congress',
      'sihong-memorial',
      'jiangshangqing-memorial',
      'yangzhou-martyrs',
    ]);
  });

  it('keeps every site even when a pinyin key is missing', () => {
    const unknownSite: Site = {
      ...productionSites[0],
      id: 'unknown-memorial',
      city: '未知市',
      officialName: '未知纪念馆',
    };
    const result = sortSitesForDirectory([...productionSites, unknownSite]);

    expect(result).toHaveLength(9);
    expect(result.map(({ id }) => id)).toContain('unknown-memorial');
  });
});
