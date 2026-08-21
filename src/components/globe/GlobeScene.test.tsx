import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  globeColor: ReturnType<typeof vi.fn>;
  pointColorAccessor: ((point: object) => string) | undefined;
  pointClick: ((point: object) => void) | undefined;
  pointData: Marker[];
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

vi.mock('globe.gl', () => {
  globeMock.moduleLoads += 1;

  return {
    default: class MockGlobe {
      background: string | undefined;
      destructor = vi.fn();
      globeColor = vi.fn();
      pointColorAccessor: ((point: object) => string) | undefined;
      pointClick: ((point: object) => void) | undefined;
      pointData: Marker[] = [];
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
    onSelect: vi.fn(),
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
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
