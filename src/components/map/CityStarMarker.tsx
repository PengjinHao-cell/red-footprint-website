import type { CSSProperties } from 'react';

import type { Site } from '../../data/siteSchema';
import type { ProjectedPoint } from './mapProjection';

type MarkerViewBox = { height: number; width: number };

type MarkerSite = Pick<Site, 'id' | 'officialName' | 'shortName'>;

type CityStarMarkerProps = {
  disabled: boolean;
  onSelect: (siteId: string) => void;
  onSelectStar?: (clientX: number, clientY: number, siteId: string) => void;
  phaseIndex?: number;
  placement?: 'absolute' | 'responsive';
  point: ProjectedPoint;
  registerAnchor?: (element: HTMLElement | null) => void;
  selected?: boolean;
  site: MarkerSite;
  viewBox?: MarkerViewBox;
};

const STAR_PATH =
  'M0 -36 L10.6 -12.5 35.2 -10.9 16.6 5.4 21.8 29.8 0 17.5 -21.8 29.8 -16.6 5.4 -35.2 -10.9 -10.6 -12.5 Z';

export default function CityStarMarker({
  disabled,
  onSelect,
  onSelectStar,
  phaseIndex = 0,
  placement = 'absolute',
  point,
  registerAnchor,
  selected = false,
  site,
  viewBox,
}: CityStarMarkerProps) {
  const responsive = placement === 'responsive' && viewBox;
  const markerStyle: CSSProperties = {
    left: responsive ? `${(point.x / viewBox.width) * 100}%` : point.x,
    top: responsive ? `${(point.y / viewBox.height) * 100}%` : point.y,
  };
  const shapeStyle: CSSProperties = {
    animationDelay: `${-(phaseIndex * 0.17).toFixed(2)}s`,
  };

  return (
    <span
      className="city-star"
      data-anchor-x={point.x}
      data-anchor-y={point.y}
      data-phase={phaseIndex % 3}
      data-selected={selected}
      data-testid="city-star"
      ref={registerAnchor}
      style={markerStyle}
    >
      <button
        aria-label={`定位并查看${site.officialName}`}
        className="city-star__hit"
        disabled={disabled}
        onClick={(event) => {
          if (onSelectStar) {
            onSelectStar(event.clientX, event.clientY, site.id);
          } else {
            onSelect(site.id);
          }
        }}
        type="button"
      >
        <span aria-hidden="true" className="city-star__shape" style={shapeStyle}>
          <svg aria-hidden="true" viewBox="-42 -42 84 84">
            <path d={STAR_PATH} />
          </svg>
        </span>
      </button>
      <button
        aria-label={site.officialName}
        className="city-star__label-button"
        disabled={disabled}
        onClick={() => onSelect(site.id)}
        type="button"
      >
        {site.shortName}
      </button>
    </span>
  );
}
