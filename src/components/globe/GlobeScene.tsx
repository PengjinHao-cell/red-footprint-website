import { useEffect, useMemo, useRef, useState } from 'react';

import type { Site } from '../../data/siteSchema';
import useWebGLSupport from '../../hooks/useWebGLSupport';
import SiteListFallback from './SiteListFallback';

const PAPER_COLOR = '#fbf7ee';
const SAND_COLOR = '#e7d4b5';
const BRICK_COLOR = '#982e2d';
const VISITED_COLOR = '#54201d';
const SELECTED_COLOR = '#b33a32';
const MAX_DEVICE_PIXEL_RATIO = 1.5;

type MarkerState = 'selected' | 'visited' | 'unvisited';

type GlobeMarker = {
  id: string;
  officialName: string;
  lat: number;
  lng: number;
  markerState: MarkerState;
};

type WarmGlobeMaterial = {
  color?: {
    set: (color: string) => void;
  };
  shininess?: number;
};

type GlobeSceneProps = {
  sites: ReadonlyArray<Site>;
  visitedIds: ReadonlyArray<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReady: () => void;
  onError: (error: Error) => void;
};

function hasComplianceMetadata(): boolean {
  const sourceUrl = import.meta.env.VITE_MAP_SOURCE_URL?.trim();
  const reviewNumber = import.meta.env.VITE_MAP_REVIEW_NUMBER?.trim();
  const verificationRecord =
    import.meta.env.VITE_MAP_VERIFICATION_RECORD?.trim();

  if (!sourceUrl || !reviewNumber || !verificationRecord) {
    return false;
  }

  try {
    return new URL(sourceUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

function getMarkerColor(marker: GlobeMarker): string {
  if (marker.markerState === 'selected') {
    return SELECTED_COLOR;
  }

  return marker.markerState === 'visited' ? VISITED_COLOR : BRICK_COLOR;
}

function toError(value: unknown): Error {
  return value instanceof Error
    ? value
    : new Error('Globe initialization failed.');
}

export default function GlobeScene({
  sites,
  visitedIds,
  selectedId,
  onSelect,
  onReady,
  onError,
}: GlobeSceneProps) {
  const supportsWebGL = useWebGLSupport();
  const complianceReady = hasComplianceMetadata();
  const containerRef = useRef<HTMLDivElement>(null);
  const complianceErrorReportedRef = useRef(false);
  const [initializationFailed, setInitializationFailed] = useState(false);

  const markers = useMemo<GlobeMarker[]>(() => {
    const visitedSet = new Set(visitedIds);

    return sites.map((site) => ({
      id: site.id,
      officialName: site.officialName,
      lat: site.coordinates.lat,
      lng: site.coordinates.lng,
      markerState:
        site.id === selectedId
          ? 'selected'
          : visitedSet.has(site.id)
            ? 'visited'
            : 'unvisited',
    }));
  }, [selectedId, sites, visitedIds]);

  useEffect(() => {
    if (!supportsWebGL || complianceReady) {
      complianceErrorReportedRef.current = false;
      return;
    }

    if (!complianceErrorReportedRef.current) {
      complianceErrorReportedRef.current = true;
      onError(
        new Error(
          'Map compliance metadata is incomplete; globe initialization was refused.',
        ),
      );
    }
  }, [complianceReady, onError, supportsWebGL]);

  useEffect(() => {
    if (!supportsWebGL || !complianceReady || initializationFailed) {
      return;
    }

    let active = true;
    let globe: import('globe.gl').GlobeInstance | undefined;
    let readyDelivered = false;

    async function initializeGlobe() {
      try {
        const container = containerRef.current;
        if (!container) {
          throw new Error('Globe container is unavailable.');
        }

        const { default: Globe } = await import('globe.gl');
        if (!active) {
          return;
        }

        globe = new Globe(container, {
          rendererConfig: {
            alpha: true,
            antialias: true,
          },
        });

        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 480);
        const unvisitedMarkers = markers.filter(
          ({ markerState }) => markerState === 'unvisited',
        );

        globe
          .width(width)
          .height(height)
          .backgroundColor(PAPER_COLOR)
          .showAtmosphere(true)
          .atmosphereColor(SAND_COLOR)
          .atmosphereAltitude(0.12)
          .pointsData(markers)
          .pointLat('lat')
          .pointLng('lng')
          .pointLabel('officialName')
          .pointColor((point) => getMarkerColor(point as GlobeMarker))
          .pointAltitude((point) =>
            (point as GlobeMarker).markerState === 'selected' ? 0.045 : 0.025,
          )
          .pointRadius((point) =>
            (point as GlobeMarker).markerState === 'selected' ? 0.55 : 0.38,
          )
          .ringsData(unvisitedMarkers)
          .ringLat('lat')
          .ringLng('lng')
          .ringColor([BRICK_COLOR, 'rgba(152, 46, 45, 0)'])
          .ringMaxRadius(2.2)
          .ringPropagationSpeed(0.55)
          .ringRepeatPeriod(2200)
          .onPointClick((point) => {
            if (active) {
              onSelect((point as GlobeMarker).id);
            }
          })
          .onGlobeReady(() => {
            if (!active || readyDelivered) {
              return;
            }

            readyDelivered = true;
            onReady();
          });

        const material = globe.globeMaterial() as WarmGlobeMaterial;
        material.color?.set(SAND_COLOR);
        material.shininess = 8;

        const devicePixelRatio =
          typeof window === 'undefined' || !Number.isFinite(window.devicePixelRatio)
            ? 1
            : window.devicePixelRatio;
        globe
          .renderer()
          .setPixelRatio(
            Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, devicePixelRatio)),
          );

        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
        controls.enableDamping = true;
      } catch (error) {
        if (!active) {
          return;
        }

        globe?._destructor();
        globe = undefined;
        setInitializationFailed(true);
        onError(toError(error));
      }
    }

    void initializeGlobe();

    return () => {
      active = false;
      globe?._destructor();
      globe = undefined;
    };
  }, [
    complianceReady,
    initializationFailed,
    markers,
    onError,
    onReady,
    onSelect,
    supportsWebGL,
  ]);

  if (!supportsWebGL || !complianceReady || initializationFailed) {
    return <SiteListFallback sites={sites} onSelect={onSelect} />;
  }

  return (
    <section
      aria-label="暖色三维红色足迹地球"
      style={{
        position: 'relative',
        minHeight: '30rem',
        overflow: 'hidden',
        border: `1px solid ${SAND_COLOR}`,
        borderRadius: '1rem',
        background: PAPER_COLOR,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', minHeight: '30rem' }}
      />
    </section>
  );
}
