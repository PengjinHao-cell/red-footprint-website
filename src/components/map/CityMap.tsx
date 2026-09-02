import { useCallback, useMemo, useRef, useState } from 'react';

import type { Site } from '../../data/siteSchema';
import { cityIdForSite, cityMapConfigs, type CityId } from './cityMapConfig';
import CityStarMarker from './CityStarMarker';
import CityMapViewport from './CityMapViewport.tsx';
import { projectCoordinate } from './mapProjection';
import { nearestSiteId } from './nearestSite';
import './map.css';

const CITY_STAR_HIT_RADIUS = 24;

type CityMapProps = {
  cityId: CityId;
  disabled?: boolean;
  onBack: () => void;
  onSelectSite: (siteId: string) => void;
  selectedSiteId?: string | null;
  sites: ReadonlyArray<Site>;
};

export default function CityMap({
  cityId,
  disabled = false,
  onBack,
  onSelectSite,
  selectedSiteId = null,
  sites,
}: CityMapProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const config = cityMapConfigs[cityId];
  const citySites = useMemo(
    () => sites.filter((site) => cityIdForSite(site) === cityId),
    [cityId, sites],
  );

  const handleStarSelect = useCallback(
    (clientX: number, clientY: number, fallbackId: string) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        onSelectSite(fallbackId);
        return;
      }
      const candidates = Array.from(
        canvas.querySelectorAll<HTMLElement>('.city-star[data-site-id]'),
      )
        .map((element) => {
          const id = element.getAttribute('data-site-id') ?? '';
          const rect = element.getBoundingClientRect();
          return {
            id,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })
        .filter((candidate) => candidate.id !== '');
      onSelectSite(
        nearestSiteId(candidates, clientX, clientY, CITY_STAR_HIT_RADIUS) ?? fallbackId,
      );
    },
    [onSelectSite],
  );

  return (
    <section
      aria-label={`${config.name}红色足迹地图`}
      className="city-map"
    >
      <header className="city-map__header">
        <button
          className="city-map__back"
          disabled={disabled}
          onClick={onBack}
          type="button"
        >
          返回全国地图
        </button>
        <div>
          <p>城市红色足迹</p>
          <h2>{config.name}</h2>
        </div>
      </header>

      {imageFailed ? (
        <div className="city-map__fallback" role="status">
          <h3>城市底图暂时无法显示</h3>
          <p>仍可从下列文字入口继续查看景点详情。</p>
          <ul>
            {citySites.map((site) => (
              <li key={site.id}>
                <button
                  disabled={disabled}
                  onClick={() => onSelectSite(site.id)}
                  type="button"
                >
                  查看{site.officialName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="city-map__canvas" ref={canvasRef}>
          <CityMapViewport viewBox={config.viewBox}>
            <img
              aria-label={`${config.name}标准地图底图`}
              className="city-map__image"
              onError={() => setImageFailed(true)}
              src={config.imageUrl}
            />
            <div aria-hidden="true" className="city-map__canvas-wash" />
            {citySites.map((site, index) => {
              const point = projectCoordinate(
                site.coordinates,
                config.projection,
                config.viewBox,
              );
              return (
                <CityStarMarker
                  disabled={disabled}
                  key={site.id}
                  onSelect={onSelectSite}
                  onSelectStar={handleStarSelect}
                  phaseIndex={index}
                  placement="responsive"
                  point={point}
                  selected={selectedSiteId === site.id}
                  site={site}
                  viewBox={config.viewBox}
                />
              );
            })}
          </CityMapViewport>
        </div>
      )}

      <footer className="city-map__source">
        <span>审图号：{config.reviewNumber}</span>
        <a href={config.sourcePageUrl} rel="noreferrer" target="_blank">
          查看底图来源
        </a>
      </footer>
    </section>
  );
}
