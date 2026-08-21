import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { validEightSites } from '../../test/fixtures/sites';
import {
  createCameraFlightController,
  type CameraAdapter,
  type CameraFlightTimeline,
  type CameraFlightTween,
  type CameraView,
} from './cameraFlight';

const firstSite = siteSchema.parse(validEightSites[0]);
const secondSite = siteSchema.parse(validEightSites[1]);
const initialView: CameraView = {
  lat: 31.2,
  lng: 119.4,
  altitude: 1.4,
};

class FakeCamera implements CameraAdapter {
  readonly views: CameraView[] = [];
  readonly opacities: number[] = [];

  getView(): CameraView {
    return { ...initialView };
  }

  setView(view: CameraView): void {
    this.views.push({ ...view });
  }

  setOpacity(opacity: number): void {
    this.opacities.push(opacity);
  }
}

class FakeTimeline implements CameraFlightTimeline {
  readonly durations: number[] = [];
  killCalls = 0;

  private elapsedMilliseconds = 0;
  private readonly timers: Array<ReturnType<typeof setTimeout>> = [];
  private readonly leakAfterKill: boolean;

  constructor(leakAfterKill = false) {
    this.leakAfterKill = leakAfterKill;
  }

  to(target: Record<string, number>, tween: CameraFlightTween): this {
    this.durations.push(tween.duration);
    this.elapsedMilliseconds += tween.duration * 1_000;

    const timer = setTimeout(() => {
      for (const [key, value] of Object.entries(tween)) {
        if (key !== 'duration' && key !== 'onUpdate' && typeof value === 'number') {
          target[key] = value;
        }
      }

      tween.onUpdate?.();
    }, this.elapsedMilliseconds);

    this.timers.push(timer);
    return this;
  }

  call(callback: () => void): this {
    this.timers.push(setTimeout(callback, this.elapsedMilliseconds));
    return this;
  }

  kill(): void {
    this.killCalls += 1;

    if (!this.leakAfterKill) {
      this.timers.forEach((timer) => clearTimeout(timer));
    }
  }
}

function createHarness(options?: {
  reducedMotion?: boolean | (() => boolean);
  leakAfterKill?: boolean;
}) {
  const camera = new FakeCamera();
  const timelines: FakeTimeline[] = [];
  const openedSites: Site[] = [];
  const states: string[] = [];
  const controller = createCameraFlightController(camera, {
    reducedMotion: options?.reducedMotion ?? false,
    timelineFactory: () => {
      const timeline = new FakeTimeline(options?.leakAfterKill);
      timelines.push(timeline);
      return timeline;
    },
    onOpen: (site) => openedSites.push(site),
    onStateChange: (state) => states.push(state),
  });

  return { camera, controller, openedSites, states, timelines };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createCameraFlightController', () => {
  it('flies through idle, departing, arriving, and open in 2.1 seconds', () => {
    const { camera, controller, openedSites, states, timelines } =
      createHarness();

    expect(controller.getState()).toBe('idle');

    controller.flyTo(firstSite);
    expect(controller.getState()).toBe('departing');

    vi.advanceTimersByTime(450);
    expect(controller.getState()).toBe('arriving');

    vi.advanceTimersByTime(1_650);
    expect(controller.getState()).toBe('open');
    expect(states).toEqual(['departing', 'arriving', 'open']);
    expect(openedSites).toEqual([firstSite]);
    expect(timelines[0]?.durations.reduce((sum, duration) => sum + duration, 0))
      .toBeCloseTo(2.1);

    expect(camera.views[0]?.altitude).toBeGreaterThan(initialView.altitude);
    expect(camera.views[1]).toMatchObject(firstSite.coordinates);
    expect(camera.views.at(-1)?.altitude).toBeLessThan(initialView.altitude);
  });

  it('ignores a second destination while a flight is active', () => {
    const { controller, openedSites, timelines } = createHarness();

    controller.flyTo(firstSite);
    controller.flyTo(secondSite);
    vi.runAllTimers();

    expect(timelines).toHaveLength(1);
    expect(openedSites).toEqual([firstSite]);
  });

  it('returns from open to the captured overview and safely ignores idle returns', () => {
    const { camera, controller, states, timelines } = createHarness();

    controller.returnToOverview();
    expect(controller.getState()).toBe('idle');
    expect(timelines).toHaveLength(0);

    controller.flyTo(firstSite);
    vi.runAllTimers();
    controller.returnToOverview();

    expect(controller.getState()).toBe('returning');
    vi.runAllTimers();

    expect(controller.getState()).toBe('idle');
    expect(camera.views.at(-1)).toEqual(initialView);
    expect(states).toEqual([
      'departing',
      'arriving',
      'open',
      'returning',
      'idle',
    ]);
  });

  it('kills the active timeline and blocks callbacks that arrive after cancel', () => {
    const { controller, openedSites, states, timelines } = createHarness({
      leakAfterKill: true,
    });

    controller.flyTo(firstSite);
    vi.advanceTimersByTime(500);
    controller.cancel();

    expect(controller.getState()).toBe('idle');
    expect(timelines[0]?.killCalls).toBe(1);

    vi.runAllTimers();

    expect(controller.getState()).toBe('idle');
    expect(openedSites).toHaveLength(0);
    expect(states).toEqual(['departing', 'arriving', 'idle']);
  });

  it('uses short fades without spatial movement when reduced motion is enabled', () => {
    const { camera, controller, states, timelines } = createHarness({
      reducedMotion: true,
    });

    controller.flyTo(firstSite);
    vi.runAllTimers();

    expect(controller.getState()).toBe('open');
    expect(camera.views).toHaveLength(0);
    expect(camera.opacities).toEqual([0, 1]);
    expect(states).toEqual(['departing', 'arriving', 'open']);
    expect(timelines[0]?.durations).toEqual([0.12, 0.12]);

    controller.returnToOverview();
    vi.runAllTimers();

    expect(controller.getState()).toBe('idle');
    expect(camera.views).toHaveLength(0);
    expect(camera.opacities).toEqual([0, 1, 0, 1]);
    expect(states).toEqual([
      'departing',
      'arriving',
      'open',
      'returning',
      'idle',
    ]);
  });

  it('uses a newly enabled reduced-motion preference for the return boundary', () => {
    let reducedMotion = false;
    const { camera, controller, openedSites, timelines } = createHarness({
      reducedMotion: () => reducedMotion,
    });

    controller.flyTo(firstSite);
    vi.runAllTimers();

    const spatialViewsAfterFlight = camera.views.length;
    expect(spatialViewsAfterFlight).toBeGreaterThan(0);
    expect(openedSites).toEqual([firstSite]);

    reducedMotion = true;
    controller.returnToOverview();
    vi.runAllTimers();

    expect(controller.getState()).toBe('idle');
    expect(camera.views).toHaveLength(spatialViewsAfterFlight);
    expect(camera.opacities).toEqual([0, 1]);
    expect(timelines.at(-1)?.durations).toEqual([0.12, 0.12]);
    expect(openedSites).toEqual([firstSite]);
  });

  it('uses spatial motion for the next flight after reduced motion is disabled while idle', () => {
    let reducedMotion = true;
    const { camera, controller, openedSites, timelines } = createHarness({
      reducedMotion: () => reducedMotion,
    });

    reducedMotion = false;
    controller.flyTo(firstSite);
    vi.runAllTimers();

    expect(controller.getState()).toBe('open');
    expect(camera.views.length).toBeGreaterThan(0);
    expect(camera.opacities).toHaveLength(0);
    expect(timelines[0]?.durations).toEqual([0.45, 0.95, 0.7]);
    expect(openedSites).toEqual([firstSite]);
  });
});
