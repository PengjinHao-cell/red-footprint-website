import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema } from '../../data/siteSchema';
import { validEightSites } from '../../test/fixtures/sites';
import ProgressiveGlobe from './ProgressiveGlobe';

const sites = validEightSites.map((site) => siteSchema.parse(site));

const progressiveGlobeMock = vi.hoisted(() => ({
  readyOnMount: false,
  errorOnMount: false,
  readyDelivered: false,
  readyHandlers: [] as Array<() => void>,
}));

vi.mock('./GlobeScene', () => ({
  default: ({
    onReady,
    onError,
  }: {
    onReady: () => void;
    onError: (error: Error) => void;
  }) => {
    if (progressiveGlobeMock.readyOnMount && !progressiveGlobeMock.readyDelivered) {
      progressiveGlobeMock.readyDelivered = true;
      queueMicrotask(onReady);
    }
    if (progressiveGlobeMock.errorOnMount) {
      queueMicrotask(() => onError(new Error('synthetic globe failure')));
    }
    progressiveGlobeMock.readyHandlers.push(onReady);
    return <div aria-label="mock globe scene" />;
  },
}));

function renderProgressive() {
  const onSelect = vi.fn();
  const onTravelComplete = vi.fn();
  const onReturnComplete = vi.fn();
  const props = {
    sites,
    visitedIds: [] as string[],
    selectedId: null as string | null,
    detailOpen: false,
    onSelect,
    onTravelComplete,
    onReturnComplete,
  };
  return { props, ...render(<ProgressiveGlobe {...props} />) };
}

function useFakeTimersWithAnimationFrame() {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  });
}

function sceneLayerHidden(): boolean {
  return (
    screen.getByLabelText('mock globe scene').closest('[aria-hidden="true"]') !==
    null
  );
}

afterEach(() => {
  cleanup();
  progressiveGlobeMock.readyOnMount = false;
  progressiveGlobeMock.errorOnMount = false;
  progressiveGlobeMock.readyDelivered = false;
  progressiveGlobeMock.readyHandlers.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ProgressiveGlobe', () => {
  it('shows the loading placeholder while the globe is not ready', () => {
    useFakeTimersWithAnimationFrame();
    progressiveGlobeMock.readyOnMount = false;
    renderProgressive();

    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
    expect(
      screen.queryByRole('region', { name: '景点列表降级' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('waits at 75 percent until ready, then completes and reveals the map', async () => {
    useFakeTimersWithAnimationFrame();
    progressiveGlobeMock.readyOnMount = false;
    renderProgressive();

    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
    expect(sceneLayerHidden()).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_408);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '75',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '75',
    );
    expect(sceneLayerHidden()).toBe(true);

    act(() => {
      progressiveGlobeMock.readyHandlers.at(-1)?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(368);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150 + 300);
    });
    expect(
      screen.queryByLabelText('长三角地图加载占位'),
    ).not.toBeInTheDocument();
    expect(sceneLayerHidden()).toBe(false);
  });

  it('replaces the placeholder with the ready globe when onReady fires early', async () => {
    useFakeTimersWithAnimationFrame();
    progressiveGlobeMock.readyOnMount = true;
    renderProgressive();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_408);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '75',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(368);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150 + 300);
    });
    expect(
      screen.queryByLabelText('长三角地图加载占位'),
    ).not.toBeInTheDocument();
    expect(sceneLayerHidden()).toBe(false);
  });

  it('falls back to the eight-site list after 8 seconds without ready', async () => {
    useFakeTimersWithAnimationFrame();
    progressiveGlobeMock.readyOnMount = false;
    renderProgressive();

    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(
      screen.getByRole('region', { name: '景点列表降级' }),
    ).toBeVisible();
  });

  it('falls back to the eight-site list when the globe reports an error', async () => {
    progressiveGlobeMock.errorOnMount = true;
    renderProgressive();

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: '景点列表降级' }),
      ).toBeVisible(),
    );
  });
});
