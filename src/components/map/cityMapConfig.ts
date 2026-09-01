import nanjingImageUrl from '../../data/maps/cities/nanjing.jpg';
import shanghaiImageUrl from '../../data/maps/cities/shanghai.jpg';
import suqianImageUrl from '../../data/maps/cities/suqian.jpg';
import manifest from '../../data/maps/cities/city-map-sources.json';
import yangzhouImageUrl from '../../data/maps/cities/yangzhou.jpg';

import type { AffineProjection, Coordinates, ViewBox } from './mapProjection';

export type CityId = 'nanjing' | 'shanghai' | 'suqian' | 'yangzhou';

export type CitySite = {
  id: string;
  city: string;
  coordinates: Coordinates;
};

export type CityMapConfig = {
  id: CityId;
  name: string;
  imageUrl: string;
  reviewNumber: string;
  sourcePageUrl: string;
  viewBox: ViewBox;
  projection: AffineProjection;
};

const imageUrls: Record<CityId, string> = {
  nanjing: nanjingImageUrl,
  shanghai: shanghaiImageUrl,
  suqian: suqianImageUrl,
  yangzhou: yangzhouImageUrl,
};

export const cityMapConfigs = Object.fromEntries(
  manifest.cities.map((city) => [
    city.id,
    {
      id: city.id,
      name: city.name,
      imageUrl: imageUrls[city.id as CityId],
      reviewNumber: city.reviewNumber,
      sourcePageUrl: city.sourcePageUrl,
      viewBox: { width: city.width, height: city.height },
      projection: {
        kind: 'affine',
        controlPoints: city.controlPoints.map(({ coordinates, pixel }) => ({ coordinates, pixel })),
      },
    },
  ]),
) as Record<CityId, CityMapConfig>;

const cityNameToId: Record<string, CityId> = {
  南京市: 'nanjing',
  上海市: 'shanghai',
  宿迁市: 'suqian',
  扬州市: 'yangzhou',
};

export function cityIdForSite(site: Pick<CitySite, 'city'>): CityId {
  const cityId = cityNameToId[site.city];
  if (!cityId) throw new Error(`Unsupported city for map projection: ${site.city}`);
  return cityId;
}

export function groupSitesByCity<T extends CitySite>(sites: T[]): Record<CityId, T[]> {
  const grouped: Record<CityId, T[]> = {
    nanjing: [],
    shanghai: [],
    suqian: [],
    yangzhou: [],
  };
  for (const site of sites) grouped[cityIdForSite(site)].push(site);
  return grouped;
}
