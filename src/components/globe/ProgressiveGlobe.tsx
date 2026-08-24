import { useEffect, useRef, useState } from 'react';

import type { Site } from '../../data/siteSchema';
import GlobeLoadingPlaceholder from './GlobeLoadingPlaceholder';
import GlobeScene from './GlobeScene';
import SiteListFallback from './SiteListFallback';

type GlobeLoadState = 'loading' | 'ready' | 'failed' | 'timed-out';

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
  const [state, setState] = useState<GlobeLoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const previousDetailOpenRef = useRef(detailOpen);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState((current) => (current === 'loading' ? 'timed-out' : current));
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [attempt]);

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

  const retry = () => {
    setState('loading');
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
      {!ready && (
        <div
          style={{
            position: ready ? 'static' : 'absolute',
            inset: 0,
            zIndex: 1,
          }}
          aria-hidden={ready}
        >
          <GlobeLoadingPlaceholder />
        </div>
      )}
      <div
        style={{
          opacity: ready ? 1 : 0,
          pointerEvents: ready ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
        aria-hidden={!ready}
      >
        <GlobeScene
          key={attempt}
          detailOpen={detailOpen}
          onError={() => setState('failed')}
          onReady={() => setState('ready')}
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
