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

vi.mock('./GlobeScene', () => ({
  default: ({
    onReady,
    onError,
  }: {
    onReady: () => void;
    onError: (error: Error) => void;
  }) => {
    if (progressiveGlobeMock.readyOnMount) {
      queueMicrotask(onReady);
    }
    if (progressiveGlobeMock.errorOnMount) {
      queueMicrotask(() => onError(new Error('synthetic globe failure')));
    }
    return <div aria-label="mock globe scene" />;
  },
}));

const progressiveGlobeMock = vi.hoisted(() => ({
  readyOnMount: false,
  errorOnMount: false,
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

afterEach(() => {
  cleanup();
  progressiveGlobeMock.readyOnMount = false;
  progressiveGlobeMock.errorOnMount = false;
  vi.useRealTimers();
});

describe('ProgressiveGlobe', () => {
  it('shows the loading placeholder while the globe is not ready', () => {
    progressiveGlobeMock.readyOnMount = false;
    renderProgressive();

    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
    expect(
      screen.queryByRole('region', { name: '景点列表降级' }),
    ).not.toBeInTheDocument();
  });

  it('replaces the placeholder with the ready globe when onReady fires', async () => {
    progressiveGlobeMock.readyOnMount = true;
    renderProgressive();

    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByLabelText('mock globe scene')).toBeVisible(),
    );
    expect(
      screen.queryByLabelText('长三角地图加载占位'),
    ).not.toBeInTheDocument();
  });

  it('falls back to the eight-site list after 8 seconds without ready', async () => {
    vi.useFakeTimers();
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
