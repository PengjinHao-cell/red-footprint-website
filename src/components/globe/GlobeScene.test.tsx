import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { validEightSites } from '../../test/fixtures/sites';
import GlobeScene from './GlobeScene';

type Marker = {
  id: string;
  officialName: string;
  markerState: 'selected' | 'visited' | 'unvisited';
};

type MockGlobeInstance = {
  background: string | undefined;
  destructor: ReturnType<typeof vi.fn>;
  enablePointerInteractionCalls: boolean[];
  globeColor: ReturnType<typeof vi.fn>;
  pointColorAccessor: ((point: object) => string) | undefined;
  pointClick: ((point: object) => void) | undefined;
  pointData: Marker[];
  pointOfViewCalls: Array<{ altitude: number; lat: number; lng: number }>;
  readyCallback: (() => void) | undefined;
  rendererPixelRatio: ReturnType<typeof vi.fn>;
  ringData: Marker[];
};

const globeMock = vi.hoisted(() => ({
  autoReady: true,
  instances: [] as unknown[],
  moduleLoads: 0,
  shouldThrow: false,
}));

const reducedMotionMock = vi.hoisted(() => ({ enabled: false }));

const timelineMock = vi.hoisted(() => ({
  instances: [] as Array<{ killCalls: number }>,
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  default: () => reducedMotionMock.enabled,
}));

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => {
      let elapsedMilliseconds = 0;
      const timers: Array<ReturnType<typeof setTimeout>> = [];
      const instance = {
        killCalls: 0,
        to(target: Record<string, number>, tween: Record<string, unknown>) {
          elapsedMilliseconds += Number(tween.duration) * 1_000;
          timers.push(
            setTimeout(() => {
              Object.entries(tween).forEach(([key, value]) => {
                if (key !== 'duration' && key !== 'onUpdate' && typeof value === 'number') {
                  target[key] = value;
                }
              });
              if (typeof tween.onUpdate === 'function') {
                tween.onUpdate();
              }
            }, elapsedMilliseconds),
          );
          return instance;
        },
        call(callback: () => void) {
          timers.push(setTimeout(callback, elapsedMilliseconds));
          return instance;
        },
        kill() {
          instance.killCalls += 1;
          timers.forEach((timer) => clearTimeout(timer));
        },
      };

      timelineMock.instances.push(instance);
      return instance;
    },
  },
}));

vi.mock('globe.gl', () => {
  globeMock.moduleLoads += 1;

  return {
    default: class MockGlobe {
      background: string | undefined;
      destructor = vi.fn();
      enablePointerInteractionCalls: boolean[] = [];
      globeColor = vi.fn();
      pointColorAccessor: ((point: object) => string) | undefined;
      pointClick: ((point: object) => void) | undefined;
      pointData: Marker[] = [];
      pointOfViewCalls: Array<{ altitude: number; lat: number; lng: number }> = [];
      view = { lat: 31.2, lng: 119.4, altitude: 1.4 };
      readyCallback: (() => void) | undefined;
      rendererPixelRatio = vi.fn();
      ringData: Marker[] = [];

      constructor() {
        if (globeMock.shouldThrow) {
          throw new Error('synthetic globe initialization failure');
        }

        globeMock.instances.push(this);
      }

      width() {
        return this;
      }

      height() {
        return this;
      }

      backgroundColor(color: string) {
        this.background = color;
        return this;
      }

      showAtmosphere() {
        return this;
      }

      atmosphereColor() {
        return this;
      }

      atmosphereAltitude() {
        return this;
      }

      globeMaterial() {
        return {
          color: { set: this.globeColor },
          shininess: 30,
        };
      }

      pointsData(data: Marker[]) {
        this.pointData = data;
        return this;
      }

      pointLat() {
        return this;
      }

      pointLng() {
        return this;
      }

      pointLabel() {
        return this;
      }

      pointColor(accessor: (point: object) => string) {
        this.pointColorAccessor = accessor;
        return this;
      }

      pointAltitude() {
        return this;
      }

      pointRadius() {
        return this;
      }

      ringsData(data: Marker[]) {
        this.ringData = data;
        return this;
      }

      ringLat() {
        return this;
      }

      ringLng() {
        return this;
      }

      ringColor() {
        return this;
      }

      ringMaxRadius() {
        return this;
      }

      ringPropagationSpeed() {
        return this;
      }

      ringRepeatPeriod() {
        return this;
      }

      onPointClick(callback: (point: object) => void) {
        this.pointClick = callback;
        return this;
      }

      onGlobeReady(callback: () => void) {
        this.readyCallback = callback;
        if (globeMock.autoReady) {
          queueMicrotask(callback);
        }
        return this;
      }

      renderer() {
        return { setPixelRatio: this.rendererPixelRatio };
      }

      pointOfView(view?: { altitude: number; lat: number; lng: number }) {
        if (!view) {
          return { ...this.view };
        }

        this.view = { ...view };
        this.pointOfViewCalls.push({ ...view });
        return this;
      }

      enablePointerInteraction(enabled: boolean) {
        this.enablePointerInteractionCalls.push(enabled);
        return this;
      }

      controls() {
        return {
          autoRotate: false,
          autoRotateSpeed: 0,
          enableDamping: false,
        };
      }

      _destructor() {
        this.destructor();
      }
    },
  };
});

const sites: Site[] = siteSchema.array().parse(validEightSites);

function setWebGLSupported(supported: boolean) {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(
      ((contextId: string) =>
        supported && contextId === 'webgl2'
          ? ({} as WebGL2RenderingContext)
          : null) as HTMLCanvasElement['getContext'],
    );
}

function enableComplianceMetadata() {
  vi.stubEnv('VITE_MAP_SOURCE_URL', 'https://maps.example.test/approved');
  vi.stubEnv('VITE_MAP_REVIEW_NUMBER', 'TEST-REVIEW-NUMBER');
  vi.stubEnv(
    'VITE_MAP_VERIFICATION_RECORD',
    'controlled-test-verification-record',
  );
}

function renderScene(
  overrides: Partial<React.ComponentProps<typeof GlobeScene>> = {},
) {
  const props: React.ComponentProps<typeof GlobeScene> = {
    onError: vi.fn(),
    onReady: vi.fn(),
    onReturnComplete: vi.fn(),
    onSelect: vi.fn(),
    onTravelComplete: vi.fn(),
    detailOpen: false,
    selectedId: null,
    sites,
    visitedIds: [],
    ...overrides,
  };

  return { props, ...render(<GlobeScene {...props} />) };
}

function latestInstance(): MockGlobeInstance {
  return globeMock.instances.at(-1) as MockGlobeInstance;
}

afterEach(() => {
  cleanup();
  globeMock.autoReady = true;
  globeMock.instances.length = 0;
  globeMock.shouldThrow = false;
  reducedMotionMock.enabled = false;
  timelineMock.instances.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('GlobeScene', () => {
  it('shows the eight-site fallback without loading Globe.gl when WebGL is unavailable', async () => {
    setWebGLSupported(false);
    const moduleLoadsBeforeRender = globeMock.moduleLoads;
    const { props } = renderScene();

    expect(await screen.findAllByRole('button')).toHaveLength(8);
    expect(globeMock.moduleLoads).toBe(moduleLoadsBeforeRender);
    expect(globeMock.instances).toHaveLength(0);
    expect(props.onReady).not.toHaveBeenCalled();
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('refuses globe initialization and uses the list when compliance metadata is missing', async () => {
    const getContext = setWebGLSupported(true);
    const { props } = renderScene();

    await waitFor(() => expect(getContext).toHaveBeenCalledWith('webgl2'));
    expect(await screen.findAllByRole('button')).toHaveLength(8);
    expect(globeMock.instances).toHaveLength(0);
    expect(props.onReady).not.toHaveBeenCalled();
    expect(props.onError).toHaveBeenCalledTimes(1);
  });

  it('calls onReady once only after a compliant globe initializes successfully', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    await waitFor(() => expect(props.onReady).toHaveBeenCalledTimes(1));

    latestInstance().readyCallback?.();
    expect(props.onReady).toHaveBeenCalledTimes(1);
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('marks visited, unvisited, and selected points with distinct states', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    renderScene({
      selectedId: sites[0].id,
      visitedIds: [sites[0].id, sites[1].id],
    });

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();

    expect(instance.pointData[0].markerState).toBe('selected');
    expect(instance.pointData[1].markerState).toBe('visited');
    expect(instance.pointData[2].markerState).toBe('unvisited');
    expect(instance.ringData).toHaveLength(6);
    expect(instance.ringData.every(({ markerState }) => markerState === 'unvisited')).toBe(
      true,
    );
  });

  it('uses brick red, dark red, and a clear selected color for point states', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    renderScene({
      selectedId: sites[0].id,
      visitedIds: [sites[1].id],
    });

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    const getColor = instance.pointColorAccessor;

    expect(getColor?.(instance.pointData[0])).toBe('#b33a32');
    expect(getColor?.(instance.pointData[1])).toBe('#54201d');
    expect(getColor?.(instance.pointData[2])).toBe('#982e2d');
  });

  it('selects the corresponding point exactly once', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    instance.pointClick?.(instance.pointData[4]);

    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledWith(sites[4].id);
  });

  it('uses the real camera-flight controller and opens detail once after the flight', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();

    instance.pointClick?.(instance.pointData[0]);

    expect(props.onSelect).toHaveBeenCalledWith(sites[0].id);
    expect(instance.enablePointerInteractionCalls).toContain(false);
    expect(props.onTravelComplete).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(instance.pointOfViewCalls.length).toBeGreaterThan(0);
    expect(instance.pointOfViewCalls.at(-1)).toMatchObject({
      ...sites[0].coordinates,
      altitude: 0.65,
    });
    expect(props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(props.onTravelComplete).toHaveBeenCalledWith(sites[0].id);
  });

  it('ignores a second point click while the camera flight is active', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();

    instance.pointClick?.(instance.pointData[0]);
    instance.pointClick?.(instance.pointData[1]);
    act(() => vi.runAllTimers());

    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledWith(sites[0].id);
    expect(timelineMock.instances).toHaveLength(1);
    expect(props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(props.onTravelComplete).toHaveBeenCalledWith(sites[0].id);
  });

  it('cancels the active camera timeline when the scene unmounts', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props, unmount } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);

    unmount();
    act(() => vi.runAllTimers());

    expect(timelineMock.instances[0]?.killCalls).toBe(1);
    expect(props.onTravelComplete).not.toHaveBeenCalled();
  });

  it('uses reduced motion without moving in space but still opens detail once', async () => {
    reducedMotionMock.enabled = true;
    setWebGLSupported(true);
    enableComplianceMetadata();
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);

    act(() => vi.runAllTimers());

    expect(instance.pointOfViewCalls).toHaveLength(0);
    expect(props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(props.onTravelComplete).toHaveBeenCalledWith(sites[0].id);
  });

  it('returns to the captured overview and reports completion once', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const rendered = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);
    act(() => vi.runAllTimers());

    rendered.rerender(<GlobeScene {...rendered.props} detailOpen />);
    rendered.rerender(<GlobeScene {...rendered.props} detailOpen={false} />);
    act(() => vi.runAllTimers());

    expect(instance.pointOfViewCalls.at(-1)).toEqual({
      lat: 31.2,
      lng: 119.4,
      altitude: 1.4,
    });
    expect(rendered.props.onReturnComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps an open journey returnable when reduced-motion preference changes', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    const rendered = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);
    act(() => vi.runAllTimers());

    reducedMotionMock.enabled = true;
    rendered.rerender(<GlobeScene {...rendered.props} detailOpen />);
    await act(async () => Promise.resolve());
    rendered.rerender(<GlobeScene {...rendered.props} detailOpen={false} />);
    act(() => vi.runAllTimers());

    expect(rendered.props.onReturnComplete).toHaveBeenCalledTimes(1);
    expect(globeMock.instances).toHaveLength(1);
  });

  it('uses a bright warm shell and caps high device pixel ratios', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    vi.stubGlobal('devicePixelRatio', 3);
    renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();

    expect(instance.background).toBe('#fbf7ee');
    expect(instance.globeColor).toHaveBeenCalledWith('#e7d4b5');
    expect(instance.rendererPixelRatio).toHaveBeenCalledWith(1.5);
  });

  it('reports initialization errors and switches to the eight-site fallback', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    globeMock.shouldThrow = true;
    const { props } = renderScene();

    await waitFor(() => expect(props.onError).toHaveBeenCalledTimes(1));
    expect(props.onReady).not.toHaveBeenCalled();
    expect(await screen.findAllByRole('button')).toHaveLength(8);
  });

  it('does not call callbacks after unmount and destroys the globe instance', async () => {
    setWebGLSupported(true);
    enableComplianceMetadata();
    globeMock.autoReady = false;
    const { props, unmount } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    unmount();

    instance.readyCallback?.();
    instance.pointClick?.(instance.pointData[0]);

    expect(instance.destructor).toHaveBeenCalledTimes(1);
    expect(props.onReady).not.toHaveBeenCalled();
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onError).not.toHaveBeenCalled();
  });
});
