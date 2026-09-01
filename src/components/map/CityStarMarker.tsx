import type { CSSProperties } from 'react';

import type { Site } from '../../data/siteSchema';
import type { ProjectedPoint } from './mapProjection';

type MarkerViewBox = { height: number; width: number };

type MarkerSite = Pick<Site, 'id' | 'officialName' | 'shortName'>;

type CityStarMarkerProps = {
  disabled: boolean;
  onSelect: (siteId: string) => void;
  phaseIndex?: number;
  placement?: 'absolute' | 'responsive';
  point: ProjectedPoint;
  selected?: boolean;
  site: MarkerSite;
  viewBox?: MarkerViewBox;
};

const STAR_PATH =
  'M0 -36 L10.6 -12.5 35.2 -10.9 16.6 5.4 21.8 29.8 0 17.5 -21.8 29.8 -16.6 5.4 -35.2 -10.9 -10.6 -12.5 Z';

export default function CityStarMarker({
  disabled,
  onSelect,
  phaseIndex = 0,
  placement = 'absolute',
  point,
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
    <button
      aria-label={site.officialName}
      className="city-star"
      data-anchor-x={point.x}
      data-anchor-y={point.y}
      data-phase={phaseIndex % 3}
      data-selected={selected}
      data-testid="city-star"
      disabled={disabled}
      onClick={() => onSelect(site.id)}
      style={markerStyle}
      type="button"
    >
      <span aria-hidden="true" className="city-star__shape" style={shapeStyle}>
        <svg aria-hidden="true" viewBox="-42 -42 84 84">
          <path d={STAR_PATH} />
        </svg>
      </span>
      <span className="city-star__label">{site.shortName}</span>
    </button>
  );
}
