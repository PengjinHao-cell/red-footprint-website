import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import chinaGlobeMap from '../../data/china-globe-map.simplified.json';
import type { Site } from '../../data/siteSchema';
import useReducedMotion from '../../hooks/useReducedMotion';
import useWebGLSupport from '../../hooks/useWebGLSupport';
import {
  createCameraFlightController,
  type CameraFlightController,
  type CameraFlightState,
} from './cameraFlight';
import { getYangtzeDeltaOverview } from './globeView';
import { layoutNearbyMarkers } from './markerLayout';
import { getMarkerPresentation } from './markerPresentation';
import { isTapGesture, type PointerSample } from './pointerIntent';
import { getRenderBudget } from './renderBudget';
import SiteListFallback from './SiteListFallback';

const PAPER_COLOR = '#fbf7ee';
const SAND_COLOR = '#e7d4b5';
const BRICK_COLOR = '#982e2d';
const VISITED_COLOR = '#54201d';
const SELECTED_COLOR = '#b33a32';
const BOUNDARY_COLOR = '#7f463c';
const PROVINCE_COLOR = '#e2c9a4';
/** 进入精确定位阶段（偏移归零、尺寸封顶）的相机高度阈值。 */
const PRECISION_ALTITUDE = 0.35;
type MarkerState = 'selected' | 'visited' | 'unvisited';

type GlobeMarker = {
  id: string;
  officialName: string;
  lat: number;
  lng: number;
  primary: boolean;
  markerState: MarkerState;
};

type GlobeMapFeature = {
  type: 'Feature';
  properties: {
    adcode: string;
    name: string;
    kind: 'province' | 'maritime-boundary';
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
};

type GeoPosition = [number, number];

type GlobePath = {
  points: GeoPosition[];
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
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onTravelComplete: (id: string) => void;
  onReturnComplete: () => void;
  onReady: () => void;
  onError: (error: Error) => void;
};

const globeMapFeatures = chinaGlobeMap.features as GlobeMapFeature[];
const provinceFeatures = globeMapFeatures.filter(
  ({ properties }) => properties.kind === 'province',
);

function collectLinearRings(value: unknown, output: GeoPosition[][] = []) {
  if (!Array.isArray(value)) {
    return output;
  }

  if (
    value.length >= 2 &&
    value.every(
      (position) =>
        Array.isArray(position) &&
        position.length >= 2 &&
        typeof position[0] === 'number' &&
        typeof position[1] === 'number',
    )
  ) {
    output.push(value.map(([lng, lat]) => [lng, lat]));
    return output;
  }

  value.forEach((child) => collectLinearRings(child, output));
  return output;
}

const maritimeBoundaryPaths: GlobePath[] = globeMapFeatures
  .filter(({ properties }) => properties.kind === 'maritime-boundary')
  .flatMap(({ geometry }) => collectLinearRings(geometry.coordinates))
  .map((points) => ({ points }));

function getMarkerColor(marker: GlobeMarker): string {
  if (marker.markerState === 'selected') {
    return SELECTED_COLOR;
  }

  return marker.markerState === 'visited' ? VISITED_COLOR : BRICK_COLOR;
}

function createStarElement(
  marker: GlobeMarker,
  offset: { x: number; y: number },
  onActivate: (marker: GlobeMarker) => void,
) {
  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'globe-marker';
  star.setAttribute('aria-label', marker.officialName);
  star.setAttribute('aria-pressed', String(marker.markerState === 'selected'));
  star.style.appearance = 'none';
  star.style.background = 'transparent';
  star.style.border = '0';
  star.style.cursor = 'pointer';
  star.style.padding = '0';
  star.style.width = '44px';
  star.style.height = '44px';
  star.style.pointerEvents = 'auto';
  star.style.setProperty('--marker-x', `${offset.x}px`);
  star.style.setProperty('--marker-y', `${offset.y}px`);
  star.style.setProperty('--marker-scale', '1');
  const leaderLength = Math.hypot(offset.x, offset.y);
  const leaderAngle =
    leaderLength === 0
      ? 0
      : (Math.atan2(offset.y, offset.x) * 180) / Math.PI;
  star.style.setProperty('--leader-length', `${leaderLength}px`);
  star.style.setProperty('--leader-angle', `${leaderAngle}deg`);

  const leader = document.createElement('span');
  leader.className = 'globe-marker__leader';
  leader.setAttribute('aria-hidden', 'true');
  star.append(leader);

  const tooltip = document.createElement('span');
  tooltip.className = 'globe-marker__tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.textContent = marker.officialName;
  star.append(tooltip);

  const starSpan = document.createElement('span');
  starSpan.className = 'globe-marker__star';
  star.append(starSpan);

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = marker.primary ? '2rem' : '1.45rem';
  svg.style.height = marker.primary ? '2rem' : '1.45rem';
  svg.style.display = 'block';
  const path = document.createElementNS(svgNamespace, 'path');
  path.setAttribute(
    'd',
    'M12 2.5l2.84 5.75 6.35.92-4.6 4.48 1.09 6.32L12 17l-5.68 2.97 1.09-6.32-4.6-4.48 6.35-.92L12 2.5z',
  );
  path.setAttribute('fill', getMarkerColor(marker));
  svg.append(path);
  starSpan.append(svg);

  let pointerStart: PointerSample | null = null;
  let pointerMoved = false;
  let tapApproved = false;

  star.addEventListener('pointerdown', (event) => {
    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    };
    pointerMoved = false;
    tapApproved = false;
  });

  star.addEventListener('pointermove', (event) => {
    if (!pointerStart || pointerMoved) {
      return;
    }
    if (
      !isTapGesture(pointerStart, {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
      })
    ) {
      pointerMoved = true;
    }
  });

  star.addEventListener('pointercancel', () => {
    pointerStart = null;
    pointerMoved = false;
    tapApproved = false;
  });

  star.addEventListener('pointerup', (event) => {
    if (
      pointerStart &&
      event.pointerId === pointerStart.pointerId &&
      !pointerMoved
    ) {
      tapApproved = true;
    }
    pointerStart = null;
  });

  star.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const keyboardClick = event.detail === 0;
    if (keyboardClick || tapApproved) {
      tapApproved = false;
      onActivate(marker);
    }
  });
  return star;
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
  detailOpen,
  onSelect,
  onTravelComplete,
  onReturnComplete,
  onReady,
  onError,
}: GlobeSceneProps) {
  const supportsWebGL = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<import('globe.gl').GlobeInstance | null>(null);
  const controllerRef = useRef<CameraFlightController | null>(null);
  const activeSiteIdRef = useRef<string | null>(null);
  const fallbackSelectionLockedRef = useRef(false);
  const previousDetailOpenRef = useRef(detailOpen);
  const sitesRef = useRef(sites);
  const markersRef = useRef<GlobeMarker[]>([]);
  const markerLayoutsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const markerButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const overviewAltitudeRef = useRef(0.9);
  const currentAltitudeRef = useRef<number | null>(null);
  const animateRingsRef = useRef(true);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onTravelCompleteRef = useRef(onTravelComplete);
  const onReturnCompleteRef = useRef(onReturnComplete);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const fallbackErrorDeliveredRef = useRef(false);
  const forceE2EHarnessFallback =
    import.meta.env.DEV &&
    import.meta.env.VITE_E2E_FORCE_FALLBACK === '1' &&
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/tests/e2e/harness/');

  const markers = useMemo<GlobeMarker[]>(() => {
    const visitedSet = new Set(visitedIds);

    return sites.map((site) => ({
      id: site.id,
      officialName: site.officialName,
      lat: site.coordinates.lat,
      lng: site.coordinates.lng,
      primary: /(?:第一次全国代表大会|一大会址)/.test(
        site.officialName,
      ),
      markerState:
        site.id === selectedId
          ? 'selected'
          : visitedSet.has(site.id)
            ? 'visited'
            : 'unvisited',
    }));
  }, [selectedId, sites, visitedIds]);

  useEffect(() => {
    sitesRef.current = sites;
    selectedIdRef.current = selectedId;
    reducedMotionRef.current = reducedMotion;
    markersRef.current = markers;
    markerLayoutsRef.current = new Map(
      layoutNearbyMarkers(
        markers.map(({ id, lat, lng }) => ({ id, lat, lng })),
      ).map(({ id, offset }) => [id, offset]),
    );
    onSelectRef.current = onSelect;
    onTravelCompleteRef.current = onTravelComplete;
    onReturnCompleteRef.current = onReturnComplete;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [
    markers,
    onError,
    onReady,
    onReturnComplete,
    onSelect,
    onTravelComplete,
    reducedMotion,
    selectedId,
    sites,
  ]);

  const updateMarkerPresentations = useCallback((altitude: number) => {
    const overviewAltitude = overviewAltitudeRef.current;
    const selectedIds = new Set(
      markersRef.current
        .filter(({ markerState }) => markerState === 'selected')
        .map(({ id }) => id),
    );

    markerButtonsRef.current.forEach((button, id) => {
      const baseOffset = selectedIds.has(id)
        ? { x: 0, y: 0 }
        : (markerLayoutsRef.current.get(id) ?? { x: 0, y: 0 });
      const { offset, scale } = getMarkerPresentation({
        altitude,
        overviewAltitude,
        precisionAltitude: PRECISION_ALTITUDE,
        baseOffset,
      });
      button.style.setProperty('--marker-x', `${offset.x}px`);
      button.style.setProperty('--marker-y', `${offset.y}px`);
      button.style.setProperty('--marker-scale', String(scale));
      const leaderLength = Math.hypot(offset.x, offset.y);
      const leaderAngle =
        leaderLength === 0
          ? 0
          : (Math.atan2(offset.y, offset.x) * 180) / Math.PI;
      button.style.setProperty('--leader-length', `${leaderLength}px`);
      button.style.setProperty('--leader-angle', `${leaderAngle}deg`);
    });
  }, []);

  useEffect(() => {
    if (forceE2EHarnessFallback || !supportsWebGL || initializationFailed) {
      if (!fallbackErrorDeliveredRef.current) {
        fallbackErrorDeliveredRef.current = true;
        onErrorRef.current(
          new Error(
            forceE2EHarnessFallback
              ? 'Synthetic E2E harness fallback.'
              : !supportsWebGL
                ? 'WebGL is not supported by this browser.'
                : 'Globe initialization failed.',
          ),
        );
      }
      return;
    }
    fallbackErrorDeliveredRef.current = false;

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

        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 480);
        const budget = getRenderBudget({
          width,
          devicePixelRatio:
            typeof window === 'undefined' ||
            !Number.isFinite(window.devicePixelRatio)
              ? 1
              : window.devicePixelRatio,
        });

        globe = new Globe(container, {
          animateIn: false,
          rendererConfig: {
            alpha: true,
            antialias: budget.antialias,
          },
        });
        globeRef.current = globe;
        animateRingsRef.current = budget.animateRings;

        const overview = getYangtzeDeltaOverview(width);
        overviewAltitudeRef.current = overview.altitude;
        const initialMarkers = markersRef.current;
        const initialUnvisitedMarkers = budget.animateRings
          ? initialMarkers.filter(
              ({ markerState }) => markerState === 'unvisited',
            )
          : [];

        let previousFlightState: CameraFlightState = 'idle';
        const controls = globe.controls();
        const controller = createCameraFlightController(
          {
            getView: () =>
              readyDelivered
                ? (globe?.pointOfView() ?? overview)
                : overview,
            setView: (view) => {
              globe?.pointOfView(view, 0);
            },
            setOpacity: (opacity) => {
              if (containerRef.current) {
                containerRef.current.style.opacity = String(opacity);
              }
            },
          },
          {
            reducedMotion: () => reducedMotionRef.current,
            onOpen: (site) => {
              if (active) {
                onTravelCompleteRef.current(site.id);
              }
            },
            onStateChange: (state) => {
              if (!active || !globe) {
                return;
              }

              const returningFinished =
                previousFlightState === 'returning' && state === 'idle';
              previousFlightState = state;
              const idle = state === 'idle';
              controls.autoRotate = false;
              globe.enablePointerInteraction(idle);

              if (returningFinished) {
                activeSiteIdRef.current = null;
                onReturnCompleteRef.current();
              }
            },
          },
        );
        controllerRef.current = controller;

        const selectMarker = (marker: GlobeMarker) => {
          if (!active || controller.getState() !== 'idle') {
            return;
          }

          const site = sitesRef.current.find(({ id }) => id === marker.id);
          if (!site) {
            return;
          }

          try {
            activeSiteIdRef.current = site.id;
            controller.flyTo(site);
            if (controller.getState() !== 'idle') {
              onSelectRef.current(site.id);
            }
          } catch (error) {
            controller.cancel();
            activeSiteIdRef.current = null;
            setInitializationFailed(true);
            onErrorRef.current(toError(error));
          }
        };

        globe
          .width(width)
          .height(height)
          .backgroundColor(PAPER_COLOR)
          .showAtmosphere(true)
          .atmosphereColor(SAND_COLOR)
          .atmosphereAltitude(0.12)
          .polygonsData(provinceFeatures)
          .polygonAltitude(0.006)
          .polygonCapColor(() => PROVINCE_COLOR)
          .polygonSideColor(() => SAND_COLOR)
          .polygonStrokeColor(() => BOUNDARY_COLOR)
          .pathsData(maritimeBoundaryPaths)
          .pathPoints('points')
          .pathPointLat((point) => (point as GeoPosition)[1])
          .pathPointLng((point) => (point as GeoPosition)[0])
          .pathColor(() => BOUNDARY_COLOR)
          .pathStroke(0.35)
          .pathPointAlt(0.008)
          .htmlElementsData(initialMarkers)
          .htmlLat('lat')
          .htmlLng('lng')
          .htmlAltitude(0.025)
          .htmlElement((marker) => {
            const globeMarker = marker as GlobeMarker;
            const offset =
              globeMarker.markerState === 'selected'
                ? { x: 0, y: 0 }
                : (markerLayoutsRef.current.get(globeMarker.id) ?? {
                    x: 0,
                    y: 0,
                  });
            const button = createStarElement(
              globeMarker,
              offset,
              selectMarker,
            );
            markerButtonsRef.current.set(globeMarker.id, button);
            return button;
          })
          .ringsData(initialUnvisitedMarkers)
          .ringLat('lat')
          .ringLng('lng')
          .ringColor([BRICK_COLOR, 'rgba(152, 46, 45, 0)'])
          .ringMaxRadius(2.2)
          .ringPropagationSpeed(0.55)
          .ringRepeatPeriod(2200)
          .onZoom(({ altitude }) => {
            if (!active) {
              return;
            }
            currentAltitudeRef.current = altitude;
            updateMarkerPresentations(altitude);
          })
          .onGlobeReady(() => {
            if (!active || readyDelivered) {
              return;
            }

            globe?.pointOfView(overview, 0);
            currentAltitudeRef.current = overview.altitude;
            updateMarkerPresentations(overview.altitude);
            readyDelivered = true;
            onReadyRef.current();
          });

        const material = globe.globeMaterial() as WarmGlobeMaterial;
        material.color?.set(SAND_COLOR);
        material.shininess = 8;

        globe.renderer().setPixelRatio(budget.pixelRatio);

        controls.autoRotate = false;
        controls.enableDamping = true;
      } catch (error) {
        if (!active) {
          return;
        }

        controllerRef.current?.cancel();
        controllerRef.current = null;
        globe?._destructor();
        globe = undefined;
        globeRef.current = null;
        setInitializationFailed(true);
        onErrorRef.current(toError(error));
      }
    }

    void initializeGlobe();

    return () => {
      active = false;
      controllerRef.current?.cancel();
      controllerRef.current = null;
      globe?._destructor();
      globe = undefined;
      globeRef.current = null;
      activeSiteIdRef.current = null;
    };
  }, [forceE2EHarnessFallback, initializationFailed, supportsWebGL, updateMarkerPresentations]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }

    globe.htmlElementsData(markers).ringsData(
      animateRingsRef.current
        ? markers.filter(({ markerState }) => markerState === 'unvisited')
        : [],
    );
    updateMarkerPresentations(
      currentAltitudeRef.current ?? overviewAltitudeRef.current,
    );
  }, [markers, updateMarkerPresentations]);

  useEffect(() => {
    const controller = controllerRef.current;
    const activeSiteId = activeSiteIdRef.current;
    if (
      controller &&
      controller.getState() !== 'idle' &&
      activeSiteId &&
      selectedId !== activeSiteId
    ) {
      controller.cancel();
      activeSiteIdRef.current = null;
    }

    if (selectedId === null) {
      fallbackSelectionLockedRef.current = false;
    }
  }, [selectedId]);

  useEffect(() => {
    const wasDetailOpen = previousDetailOpenRef.current;
    previousDetailOpenRef.current = detailOpen;
    if (!wasDetailOpen || detailOpen) {
      return;
    }

    const controller = controllerRef.current;
    if (controller?.getState() === 'open') {
      controller.returnToOverview();
      return;
    }

    if (!controller && selectedIdRef.current !== null) {
      queueMicrotask(() => onReturnCompleteRef.current());
    }
  }, [detailOpen]);

  const showFallback =
    forceE2EHarnessFallback || !supportsWebGL || initializationFailed;

  const selectFromFallback = (id: string) => {
    if (fallbackSelectionLockedRef.current || selectedIdRef.current !== null) {
      return;
    }

    fallbackSelectionLockedRef.current = true;
    onSelectRef.current(id);
    queueMicrotask(() => onTravelCompleteRef.current(id));
  };

  if (showFallback) {
    return <SiteListFallback sites={sites} onSelect={selectFromFallback} />;
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
