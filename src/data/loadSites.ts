import { z } from 'zod';

import { siteSchema, type Site } from './siteSchema';

const siteCollectionSchema = z
  .array(siteSchema)
  .length(8, 'Site collection must contain exactly 8 sites')
  .superRefine((sites, context) => {
    const ids = new Set<string>();
    const officialNames = new Set<string>();

    sites.forEach((site, index) => {
      if (ids.has(site.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Each site must have a unique id',
          path: [index, 'id'],
        });
      }
      ids.add(site.id);

      if (officialNames.has(site.officialName)) {
        context.addIssue({
          code: 'custom',
          message: 'Each site must have a unique officialName',
          path: [index, 'officialName'],
        });
      }
      officialNames.add(site.officialName);
    });
  });

export function loadSites(input: unknown): ReadonlyArray<Site> {
  return siteCollectionSchema.parse(input);
}
