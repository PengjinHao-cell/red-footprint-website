import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import {
  resetViewport,
  zoomAtPoint,
  type CityMapViewportState,
} from './cityMapViewport';

type CityMapViewportProps = {
  children: ReactNode;
  onReset?: () => void;
  viewBox: { height: number; width: number };
};

const ZOOM_STEP = 1.25;

type PointerPosition = { x: number; y: number };

export default function CityMapViewport({
  children,
  onReset,
  viewBox,
}: CityMapViewportProps) {
  const [viewport, setViewport] = useState<CityMapViewportState>(resetViewport);
  const rootRef = useRef<HTMLDivElement>(null);
  const zoomInRef = useRef<HTMLButtonElement>(null);
  const pointersRef = useRef<Map<number, PointerPosition>>(new Map());
  const pinchRef = useRef<{ distance: number; x: number; y: number } | null>(null);

  const zoomBy = useCallback((factor: number, x: number, y: number) => {
    setViewport((current) => zoomAtPoint(current, x, y, current.scale * factor));
  }, []);

  const centerAnchor = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    return { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 };
  }, []);

  const zoomIn = useCallback(() => {
    const { x, y } = centerAnchor();
    zoomBy(ZOOM_STEP, x, y);
  }, [centerAnchor, zoomBy]);

  const zoomOut = useCallback(() => {
    const { x, y } = centerAnchor();
    zoomBy(1 / ZOOM_STEP, x, y);
  }, [centerAnchor, zoomBy]);

  const reset = useCallback(() => {
    setViewport(resetViewport());
    onReset?.();
    zoomInRef.current?.focus();
  }, [onReset]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top);
    };
    root.addEventListener('wheel', handleWheel, { passive: false });
    return () => root.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  const updatePinch = useCallback(() => {
    const positions = [...pointersRef.current.values()];
    if (positions.length !== 2) {
      pinchRef.current = null;
      return;
    }
    const [a, b] = positions;
    pinchRef.current = {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      updatePinch();
    },
    [updatePinch],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointersRef.current.size !== 2) return;

      const positions = [...pointersRef.current.values()];
      const [a, b] = positions;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const previous = pinchRef.current;

      if (previous && previous.distance > 0 && distance > 0) {
        const rect = rootRef.current?.getBoundingClientRect();
        zoomBy(
          distance / previous.distance,
          x - (rect?.left ?? 0),
          y - (rect?.top ?? 0),
        );
      }
      pinchRef.current = { distance, x, y };
    },
    [zoomBy],
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(event.pointerId);
      updatePinch();
    },
    [updatePinch],
  );

  const worldStyle = {
    '--city-scale': viewport.scale,
    '--city-x': `${viewport.translateX}px`,
    '--city-y': `${viewport.translateY}px`,
  } as CSSProperties;

  return (
    <div
      className="city-map-viewport"
      data-scale={viewport.scale}
      data-testid="city-map-viewport"
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={rootRef}
      style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}
    >
      <div className="city-map-viewport__world" style={worldStyle}>
        {children}
      </div>
      <div aria-label="地图缩放" className="city-map-viewport__controls" role="group">
        <button
          aria-label="放大地图"
          onClick={zoomIn}
          ref={zoomInRef}
          type="button"
        >
          ＋
        </button>
        <button aria-label="缩小地图" onClick={zoomOut} type="button">
          －
        </button>
        <button aria-label="复位地图" onClick={reset} type="button">
          复位
        </button>
      </div>
    </div>
  );
}
