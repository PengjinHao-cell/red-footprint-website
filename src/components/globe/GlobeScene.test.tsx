import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { validEightSites } from '../../test/fixtures/sites';
import GlobeScene from './GlobeScene';

type Marker = {
  id: string;
  officialName: string;
  lat: number;
  lng: number;
  primary: boolean;
  markerState: 'selected' | 'visited' | 'unvisited';
};

type MockGlobeInstance = {
  background: string | undefined;
  controlsState: {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableDamping: boolean;
  };
  destructor: ReturnType<typeof vi.fn>;
  enablePointerInteractionCalls: boolean[];
  globeColor: ReturnType<typeof vi.fn>;
  htmlData: Marker[];
  htmlElementAccessor: ((marker: object) => HTMLElement) | undefined;
  pointColorAccessor: ((point: object) => string) | undefined;
  pointClick: ((point: object) => void) | undefined;
  pointData: Marker[];
  pointOfViewCalls: Array<{ altitude: number; lat: number; lng: number }>;
  pointRadiusAccessor: ((point: object) => number) | undefined;
  polygonData: unknown[];
  pathData: unknown[];
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
  instances: [] as Array<{ durations: number[]; killCalls: number }>,
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
        durations: [] as number[],
        killCalls: 0,
        to(target: Record<string, number>, tween: Record<string, unknown>) {
          const duration = Number(tween.duration);
          instance.durations.push(duration);
          elapsedMilliseconds += duration * 1_000;
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
      controlsState = {
        autoRotate: false,
        autoRotateSpeed: 0,
        enableDamping: false,
      };
      destructor = vi.fn();
      enablePointerInteractionCalls: boolean[] = [];
      globeColor = vi.fn();
      htmlData: Marker[] = [];
      htmlElementAccessor: ((marker: object) => HTMLElement) | undefined;
      pointColorAccessor: ((point: object) => string) | undefined;
      pointClick: ((point: object) => void) | undefined;
      pointData: Marker[] = [];
      pointOfViewCalls: Array<{ altitude: number; lat: number; lng: number }> = [];
      pointRadiusAccessor: ((point: object) => number) | undefined;
      polygonData: unknown[] = [];
      pathData: unknown[] = [];
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

      pointRadius(accessor: (point: object) => number) {
        this.pointRadiusAccessor = accessor;
        return this;
      }

      htmlElementsData(data: Marker[]) {
        this.htmlData = data;
        return this;
      }

      htmlLat() {
        return this;
      }

      htmlLng() {
        return this;
      }

      htmlAltitude() {
        return this;
      }

      htmlElement(accessor: (marker: object) => HTMLElement) {
        this.htmlElementAccessor = accessor;
        return this;
      }

      polygonsData(data: unknown[]) {
        this.polygonData = data;
        return this;
      }

      polygonAltitude() {
        return this;
      }

      polygonCapColor() {
        return this;
      }

      polygonSideColor() {
        return this;
      }

      polygonStrokeColor() {
        return this;
      }

      polygonLabel() {
        return this;
      }

      pathsData(data: unknown[]) {
        this.pathData = data;
        return this;
      }

      pathPoints() {
        return this;
      }

      pathPointLat() {
        return this;
      }

      pathPointLng() {
        return this;
      }

      pathColor() {
        return this;
      }

      pathStroke() {
        return this;
      }

      pathPointAlt() {
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
        return this.controlsState;
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
  window.history.replaceState({}, '', '/');
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
  it('uses the list fallback in the explicitly flagged development E2E harness', async () => {
    vi.stubEnv('VITE_E2E_FORCE_FALLBACK', '1');
    window.history.replaceState({}, '', '/tests/e2e/harness/');
    setWebGLSupported(true);
    const moduleLoadsBeforeRender = globeMock.moduleLoads;

    renderScene();

    expect(await screen.findAllByRole('button')).toHaveLength(8);
    expect(globeMock.moduleLoads).toBe(moduleLoadsBeforeRender);
    expect(globeMock.instances).toHaveLength(0);
    window.history.replaceState({}, '', '/');
  });

  it('keeps the globe active in the development E2E harness without the fallback flag', async () => {
    window.history.replaceState({}, '', '/tests/e2e/harness/');
    setWebGLSupported(true);

    renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    expect(
      screen.getByRole('region', { name: '暖色三维红色足迹地球' }),
    ).toBeInTheDocument();
  });

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

  it('initializes the bundled China globe resource without approval environment variables', async () => {
    setWebGLSupported(true);
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    await waitFor(() => expect(props.onReady).toHaveBeenCalledTimes(1));
    expect(latestInstance().polygonData).toHaveLength(34);
    expect(latestInstance().pathData.length).toBeGreaterThan(0);
    expect(latestInstance().pointOfViewCalls[0]).toEqual({
      lat: 35,
      lng: 104,
      altitude: 2.05,
    });
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('uses a larger China-centered overview for tablet viewports', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(720);
    setWebGLSupported(true);
    renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    expect(latestInstance().pointOfViewCalls[0]).toEqual({
      lat: 35,
      lng: 104,
      altitude: 1.45,
    });
  });

  it('centers the globe only after the real renderer reports ready', async () => {
    globeMock.autoReady = false;
    setWebGLSupported(true);
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    expect(instance.pointOfViewCalls).toHaveLength(0);

    instance.readyCallback?.();

    expect(instance.pointOfViewCalls).toEqual([
      { lat: 35, lng: 104, altitude: 2.05 },
    ]);
    expect(instance.controlsState.autoRotate).toBe(false);
    expect(props.onReady).toHaveBeenCalledTimes(1);
  });

  it('calls onReady once only after the bundled globe initializes successfully', async () => {
    setWebGLSupported(true);
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    await waitFor(() => expect(props.onReady).toHaveBeenCalledTimes(1));

    latestInstance().readyCallback?.();
    expect(props.onReady).toHaveBeenCalledTimes(1);
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('marks visited, unvisited, and selected points with distinct states', async () => {
    setWebGLSupported(true);
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

  it('keeps the first-congress star larger than the other unselected stars', async () => {
    setWebGLSupported(true);
    renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    const primaryMarker = instance.pointData.find(({ primary }) => primary);
    const regularMarker = instance.pointData.find(({ primary }) => !primary);

    expect(primaryMarker).toBeDefined();
    expect(instance.pointRadiusAccessor?.(primaryMarker!)).toBe(0.48);
    expect(instance.pointRadiusAccessor?.(regularMarker!)).toBe(0.38);
  });

  it('renders eight accessible red five-point stars at their exact coordinates', async () => {
    setWebGLSupported(true);
    renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    const stars = instance.htmlData.map((marker) =>
      instance.htmlElementAccessor?.(marker),
    );

    expect(stars).toHaveLength(8);
    expect(stars.every((star) => star?.textContent === '★')).toBe(true);
    expect(stars.map((star) => star?.getAttribute('aria-label'))).toEqual(
      sites.map(({ officialName }) => officialName),
    );
    expect(stars.every((star) => star?.style.translate === '')).toBe(true);
    expect(instance.htmlData.map(({ lat, lng }) => ({ lat, lng }))).toEqual(
      sites.map(({ coordinates }) => coordinates),
    );
  });

  it('selects the corresponding point exactly once', async () => {
    setWebGLSupported(true);
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    instance.pointClick?.(instance.pointData[4]);

    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledWith(sites[4].id);
  });

  it('uses the real camera-flight controller and opens detail once after the flight', async () => {
    setWebGLSupported(true);
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
    const { props } = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    const spatialViewsBeforeFlight = instance.pointOfViewCalls.length;
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);

    act(() => vi.runAllTimers());

    expect(instance.pointOfViewCalls).toHaveLength(spatialViewsBeforeFlight);
    expect(props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(props.onTravelComplete).toHaveBeenCalledWith(sites[0].id);
  });

  it('returns to the captured overview and reports completion once', async () => {
    setWebGLSupported(true);
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
      lat: 35,
      lng: 104,
      altitude: 2.05,
    });
    expect(rendered.props.onReturnComplete).toHaveBeenCalledTimes(1);
  });

  it('uses live reduced motion for return without rebuilding the open globe journey', async () => {
    setWebGLSupported(true);
    const rendered = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    vi.useFakeTimers();
    instance.pointClick?.(instance.pointData[0]);
    act(() => vi.runAllTimers());
    const spatialViewsAfterFlight = instance.pointOfViewCalls.length;

    expect(spatialViewsAfterFlight).toBeGreaterThan(0);
    expect(rendered.props.onTravelComplete).toHaveBeenCalledTimes(1);

    reducedMotionMock.enabled = true;
    rendered.rerender(<GlobeScene {...rendered.props} detailOpen />);
    await act(async () => Promise.resolve());
    rendered.rerender(<GlobeScene {...rendered.props} detailOpen={false} />);
    act(() => vi.runAllTimers());

    expect(rendered.props.onReturnComplete).toHaveBeenCalledTimes(1);
    expect(rendered.props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(instance.pointOfViewCalls).toHaveLength(spatialViewsAfterFlight);
    expect(timelineMock.instances.at(-1)?.durations).toEqual([0.12, 0.12]);
    expect(instance.destructor).not.toHaveBeenCalled();
    expect(globeMock.instances).toHaveLength(1);
  });

  it('uses spatial motion for the next flight after reduced motion is disabled while idle', async () => {
    reducedMotionMock.enabled = true;
    setWebGLSupported(true);
    const rendered = renderScene();

    await waitFor(() => expect(globeMock.instances).toHaveLength(1));
    const instance = latestInstance();
    reducedMotionMock.enabled = false;
    rendered.rerender(<GlobeScene {...rendered.props} />);
    await act(async () => Promise.resolve());
    vi.useFakeTimers();

    instance.pointClick?.(instance.pointData[0]);
    act(() => vi.runAllTimers());

    expect(instance.pointOfViewCalls.length).toBeGreaterThan(0);
    expect(timelineMock.instances[0]?.durations).toEqual([0.45, 0.95, 0.7]);
    expect(rendered.props.onTravelComplete).toHaveBeenCalledTimes(1);
    expect(instance.destructor).not.toHaveBeenCalled();
    expect(globeMock.instances).toHaveLength(1);
  });

  it('uses a bright warm shell and caps high device pixel ratios', async () => {
    setWebGLSupported(true);
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
    globeMock.shouldThrow = true;
    const { props } = renderScene();

    await waitFor(() => expect(props.onError).toHaveBeenCalledTimes(1));
    expect(props.onReady).not.toHaveBeenCalled();
    expect(await screen.findAllByRole('button')).toHaveLength(8);
  });

  it('does not call callbacks after unmount and destroys the globe instance', async () => {
    setWebGLSupported(true);
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
