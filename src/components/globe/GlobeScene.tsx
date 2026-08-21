import { useEffect, useMemo, useRef, useState } from 'react';

import type { Site } from '../../data/siteSchema';
import useReducedMotion from '../../hooks/useReducedMotion';
import useWebGLSupport from '../../hooks/useWebGLSupport';
import {
  createCameraFlightController,
  type CameraFlightController,
  type CameraFlightState,
} from './cameraFlight';
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
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onTravelComplete: (id: string) => void;
  onReturnComplete: () => void;
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
  detailOpen,
  onSelect,
  onTravelComplete,
  onReturnComplete,
  onReady,
  onError,
}: GlobeSceneProps) {
  const supportsWebGL = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const initialReducedMotionRef = useRef(reducedMotion);
  const complianceReady = hasComplianceMetadata();
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<import('globe.gl').GlobeInstance | null>(null);
  const controllerRef = useRef<CameraFlightController | null>(null);
  const activeSiteIdRef = useRef<string | null>(null);
  const fallbackSelectionLockedRef = useRef(false);
  const previousDetailOpenRef = useRef(detailOpen);
  const complianceErrorReportedRef = useRef(false);
  const sitesRef = useRef(sites);
  const markersRef = useRef<GlobeMarker[]>([]);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onTravelCompleteRef = useRef(onTravelComplete);
  const onReturnCompleteRef = useRef(onReturnComplete);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
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
    sitesRef.current = sites;
    selectedIdRef.current = selectedId;
    markersRef.current = markers;
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
    selectedId,
    sites,
  ]);

  useEffect(() => {
    if (!supportsWebGL || complianceReady) {
      complianceErrorReportedRef.current = false;
      return;
    }

    if (!complianceErrorReportedRef.current) {
      complianceErrorReportedRef.current = true;
      onErrorRef.current(
        new Error(
          'Map compliance metadata is incomplete; globe initialization was refused.',
        ),
      );
    }
  }, [complianceReady, supportsWebGL]);

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
        globeRef.current = globe;

        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 480);
        const initialMarkers = markersRef.current;
        const initialUnvisitedMarkers = initialMarkers.filter(
          ({ markerState }) => markerState === 'unvisited',
        );

        let previousFlightState: CameraFlightState = 'idle';
        const controls = globe.controls();
        const controller = createCameraFlightController(
          {
            getView: () => globe?.pointOfView() ?? { lat: 0, lng: 0, altitude: 2.5 },
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
            reducedMotion: initialReducedMotionRef.current,
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
              controls.autoRotate = idle;
              globe.enablePointerInteraction(idle);

              if (returningFinished) {
                activeSiteIdRef.current = null;
                onReturnCompleteRef.current();
              }
            },
          },
        );
        controllerRef.current = controller;

        globe
          .width(width)
          .height(height)
          .backgroundColor(PAPER_COLOR)
          .showAtmosphere(true)
          .atmosphereColor(SAND_COLOR)
          .atmosphereAltitude(0.12)
          .pointsData(initialMarkers)
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
          .ringsData(initialUnvisitedMarkers)
          .ringLat('lat')
          .ringLng('lng')
          .ringColor([BRICK_COLOR, 'rgba(152, 46, 45, 0)'])
          .ringMaxRadius(2.2)
          .ringPropagationSpeed(0.55)
          .ringRepeatPeriod(2200)
          .onPointClick((point) => {
            if (!active || controller.getState() !== 'idle') {
              return;
            }

            const site = sitesRef.current.find(
              ({ id }) => id === (point as GlobeMarker).id,
            );
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
          })
          .onGlobeReady(() => {
            if (!active || readyDelivered) {
              return;
            }

            readyDelivered = true;
            onReadyRef.current();
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

        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
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
  }, [complianceReady, initializationFailed, supportsWebGL]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }

    globe.pointsData(markers).ringsData(
      markers.filter(({ markerState }) => markerState === 'unvisited'),
    );
  }, [markers]);

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
    !supportsWebGL || !complianceReady || initializationFailed;

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
