import { useState } from 'react';

import chinaMap from '../../data/china-globe-map.simplified.json';
import type { CityId } from './cityMapConfig';
import './map.css';

type NationalMapProps = {
  disabled: boolean;
  onSelectCity: (cityId: CityId) => void;
};

type GeoPosition = [number, number];

type MapFeature = {
  properties: {
    adcode: string;
    kind: 'province' | 'maritime-boundary';
    name: string;
  };
  geometry: { coordinates: unknown };
};

const VIEW_BOX = { width: 1000, height: 700 };
const GEO_BOUNDS = { west: 73, east: 136, north: 54, south: 18 };

const cities: Array<{
  id: CityId;
  name: string;
  lat: number;
  lng: number;
  colorClass: string;
  glowPath: string;
  label: { x: number; y: number };
}> = [
  { id: 'suqian', name: '宿迁市', lat: 33.96, lng: 118.28, colorClass: 'ochre', glowPath: 'M-32 -8 C-20 -28 8 -30 30 -10 C38 8 18 29 -8 30 C-31 24 -42 7 -32 -8 Z', label: { x: -54, y: -38 } },
  { id: 'nanjing', name: '南京市', lat: 32.06, lng: 118.8, colorClass: 'brick', glowPath: 'M-35 -4 C-23 -29 2 -35 29 -17 C43 2 27 28 2 33 C-25 34 -43 16 -35 -4 Z', label: { x: -58, y: 52 } },
  { id: 'yangzhou', name: '扬州市', lat: 32.39, lng: 119.41, colorClass: 'teal', glowPath: 'M-31 -18 C-8 -35 22 -29 37 -6 C34 19 12 34 -15 28 C-38 15 -43 -2 -31 -18 Z', label: { x: 58, y: -34 } },
  { id: 'shanghai', name: '上海市', lat: 31.23, lng: 121.47, colorClass: 'blue', glowPath: 'M-28 -22 C-4 -35 27 -26 36 -2 C31 23 7 35 -18 29 C-38 14 -42 -7 -28 -22 Z', label: { x: 62, y: 48 } },
];

function collectRings(value: unknown, output: GeoPosition[][] = []): GeoPosition[][] {
  if (!Array.isArray(value)) return output;
  if (
    value.length >= 2 &&
    value.every(
      (position) =>
        Array.isArray(position) &&
        typeof position[0] === 'number' &&
        typeof position[1] === 'number',
    )
  ) {
    output.push(value.map(([lng, lat]) => [lng, lat]));
    return output;
  }
  value.forEach((child) => collectRings(child, output));
  return output;
}

function project([lng, lat]: GeoPosition) {
  return {
    x: ((lng - GEO_BOUNDS.west) / (GEO_BOUNDS.east - GEO_BOUNDS.west)) * VIEW_BOX.width,
    y: ((GEO_BOUNDS.north - lat) / (GEO_BOUNDS.north - GEO_BOUNDS.south)) * VIEW_BOX.height,
  };
}

function ringPath(ring: GeoPosition[]): string {
  return ring
    .map((position, index) => {
      const point = project(position);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ')
    .concat(' Z');
}

const features = chinaMap.features as MapFeature[];

export default function NationalMap({ disabled, onSelectCity }: NationalMapProps) {
  const [activeCity, setActiveCity] = useState<CityId | null>(null);

  const selectCity = (cityId: CityId) => {
    if (disabled) return;
    setActiveCity(cityId);
    onSelectCity(cityId);
  };

  return (
    <section aria-label="选择城市" className="national-map">
      <header className="national-map__heading">
        <p>长三角红色足迹</p>
        <h2>选择一座城市</h2>
      </header>
      <svg
        aria-label="中华人民共和国平面地图"
        className="national-map__svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      >
        <g aria-hidden="true" className="national-map__provinces">
          {features.map((feature) => {
            const path = collectRings(feature.geometry.coordinates).map(ringPath).join(' ');
            return (
              <path
                className={`national-map__feature national-map__feature--${feature.properties.kind}`}
                d={path}
                fillRule="evenodd"
                key={`${feature.properties.kind}-${feature.properties.adcode}`}
              />
            );
          })}
        </g>
        {cities.map((city) => {
          const anchor = project([city.lng, city.lat]);
          return (
            <g
              className={`national-map__city-anchor national-map__city-anchor--${city.colorClass}`}
              data-active={activeCity === city.id}
              key={city.id}
              transform={`translate(${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)})`}
            >
              <path aria-hidden="true" className="national-map__city-glow" d={city.glowPath} />
              <path aria-hidden="true" className="national-map__city-flash" d={city.glowPath} />
              <foreignObject height="112" width="112" x="-56" y="-56">
                <button
                  aria-label={`进入${city.name}`}
                  className="national-map__city-button"
                  data-active={activeCity === city.id}
                  disabled={disabled}
                  onClick={() => selectCity(city.id)}
                  type="button"
                >
                </button>
              </foreignObject>
              <text
                aria-hidden="true"
                className="national-map__city-label"
                textAnchor="middle"
                x={city.label.x}
                y={city.label.y}
              >
                {city.name}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="national-map__hint">点击城市色斑，进入当地红色足迹地图</p>
    </section>
  );
}
