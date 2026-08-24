import { useEffect, useRef, useState } from 'react';

import type { Site } from '../../data/siteSchema';
import useReducedMotion from '../../hooks/useReducedMotion';
import {
  CROSS_FADE_MS,
  getPendingProgress,
  getReadyProgress,
  READY_HOLD_MS,
} from './globeLoadingProgress';
import GlobeLoadingPlaceholder from './GlobeLoadingPlaceholder';
import GlobeScene from './GlobeScene';
import SiteListFallback from './SiteListFallback';

type GlobeLoadState =
  | 'loading'
  | 'finishing'
  | 'ready'
  | 'failed'
  | 'timed-out';

const READY_TIMEOUT_MS = 8_000;

type ProgressiveGlobeProps = {
  sites: ReadonlyArray<Site>;
  visitedIds: ReadonlyArray<string>;
  selectedId: string | null;
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onTravelComplete: (id: string) => void;
  onReturnComplete: () => void;
};

export default function ProgressiveGlobe({
  sites,
  visitedIds,
  selectedId,
  detailOpen,
  onSelect,
  onTravelComplete,
  onReturnComplete,
}: ProgressiveGlobeProps) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<GlobeLoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [placeholderGone, setPlaceholderGone] = useState(false);
  const readyReceivedRef = useRef(false);
  const progressRef = useRef(0);
  const progressStartRef = useRef(0);
  const finishingStartRef = useRef(0);
  const previousDetailOpenRef = useRef(detailOpen);

  useEffect(() => {
    if (state !== 'loading' && state !== 'finishing') {
      return;
    }

    if (reducedMotion) {
      if (state === 'loading') {
        progressRef.current = 75;
        queueMicrotask(() => {
          setProgress(75);
          if (readyReceivedRef.current) {
            setState('finishing');
          }
        });
      } else {
        progressRef.current = 100;
        queueMicrotask(() => {
          setProgress(100);
          setState('ready');
        });
      }
      return;
    }

    let finishing = state === 'finishing';
    const start = performance.now();
    if (finishing) {
      finishingStartRef.current = start;
    } else {
      progressStartRef.current = start;
    }

    let frame = 0;
    const tick = () => {
      const now = performance.now();
      if (!finishing) {
        const pending = getPendingProgress(now - progressStartRef.current);
        setProgress(pending);
        progressRef.current = pending;
        if (pending >= 75 && readyReceivedRef.current) {
          finishing = true;
          finishingStartRef.current = now;
        }
      } else {
        const completed = getReadyProgress(
          now - finishingStartRef.current,
        );
        setProgress(completed);
        progressRef.current = completed;
        if (completed >= 100) {
          setState('ready');
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState((current) => (current === 'loading' ? 'timed-out' : current));
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (state !== 'ready') {
      return;
    }

    const timer = setTimeout(() => {
      setPlaceholderGone(true);
    }, READY_HOLD_MS + CROSS_FADE_MS);

    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const wasOpen = previousDetailOpenRef.current;
    previousDetailOpenRef.current = detailOpen;
    if (!wasOpen || detailOpen) {
      return;
    }

    if (state === 'failed' || state === 'timed-out') {
      queueMicrotask(onReturnComplete);
    }
  }, [detailOpen, onReturnComplete, state]);

  const handleReady = () => {
    if (readyReceivedRef.current) {
      return;
    }
    readyReceivedRef.current = true;
    if (progressRef.current >= 75) {
      setState('finishing');
    }
  };

  const retry = () => {
    setState('loading');
    setProgress(0);
    setPlaceholderGone(false);
    readyReceivedRef.current = false;
    setAttempt((value) => value + 1);
  };

  const selectFromFallback = (id: string) => {
    onSelect(id);
    queueMicrotask(() => onTravelComplete(id));
  };

  if (state === 'failed' || state === 'timed-out') {
    return (
      <section role="region" aria-label="景点列表降级">
        <SiteListFallback sites={sites} onSelect={selectFromFallback} />
        {selectedId && !detailOpen && (
          <button
            onClick={onReturnComplete}
            style={{
              display: 'block',
              margin: '1rem auto 0',
              padding: '0.6rem 1.4rem',
              border: '1px solid #982e2d',
              borderRadius: '999px',
              background: '#fbf7ee',
              color: '#54201d',
              cursor: 'pointer',
              font: '700 0.9rem/1.4 sans-serif',
            }}
            type="button"
          >
            完成返回总览
          </button>
        )}
        <button
          onClick={retry}
          style={{
            display: 'block',
            margin: '1rem auto 0',
            padding: '0.6rem 1.4rem',
            border: '1px solid #982e2d',
            borderRadius: '999px',
            background: '#fbf7ee',
            color: '#54201d',
            cursor: 'pointer',
            font: '700 0.9rem/1.4 sans-serif',
          }}
          type="button"
        >
          重新加载三维地球
        </button>
      </section>
    );
  }

  const ready = state === 'ready';

  return (
    <div style={{ position: 'relative' }}>
      {!placeholderGone && (
        <div
          aria-hidden={ready}
          className={
            ready
              ? 'globe-loading-layer globe-loading-layer--leaving'
              : 'globe-loading-layer'
          }
        >
          <GlobeLoadingPlaceholder progress={progress} />
        </div>
      )}
      <div
        aria-hidden={!ready}
        className={
          ready
            ? 'globe-scene-layer globe-scene-layer--visible'
            : 'globe-scene-layer'
        }
      >
        <GlobeScene
          key={attempt}
          detailOpen={detailOpen}
          onError={() => setState('failed')}
          onReady={handleReady}
          onReturnComplete={onReturnComplete}
          onSelect={onSelect}
          onTravelComplete={onTravelComplete}
          selectedId={selectedId}
          sites={sites}
          visitedIds={visitedIds}
        />
      </div>
    </div>
  );
}
