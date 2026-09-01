import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMapMotionController,
  type MapMotionAdapter,
  type MapMotionTimeline,
  type MapMotionTween,
} from './mapMotion';

class FakeAdapter implements MapMotionAdapter {
  readonly phases: string[] = [];
  readonly scales: number[] = [];

  setPhase(phase: string): void {
    this.phases.push(phase);
  }

  setScale(scale: number): void {
    this.scales.push(scale);
  }
}

class FakeTimeline implements MapMotionTimeline {
  readonly durations: number[] = [];
  readonly timers: Array<ReturnType<typeof setTimeout>> = [];
  killCalls = 0;
  private elapsed = 0;

  to(target: Record<string, number>, tween: MapMotionTween): this {
    this.durations.push(tween.duration);
    this.elapsed += tween.duration * 1_000;
    this.timers.push(setTimeout(() => {
      for (const [key, value] of Object.entries(tween)) {
        if (key !== 'duration' && key !== 'onUpdate' && typeof value === 'number') {
          target[key] = value;
        }
      }
      tween.onUpdate?.();
    }, this.elapsed));
    return this;
  }

  call(callback: () => void): this {
    this.timers.push(setTimeout(callback, this.elapsed));
    return this;
  }

  kill(): void {
    this.killCalls += 1;
    this.timers.forEach(clearTimeout);
  }
}

function createHarness(reducedMotion = false) {
  const adapter = new FakeAdapter();
  const timelines: FakeTimeline[] = [];
  const controller = createMapMotionController(adapter, {
    reducedMotion,
    timelineFactory: () => {
      const timeline = new FakeTimeline();
      timelines.push(timeline);
      return timeline;
    },
  });
  return { adapter, controller, timelines };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createMapMotionController', () => {
  it('runs the specified enter, approach, and return timings and completes once', () => {
    const { controller, timelines } = createHarness();
    const enterComplete = vi.fn();
    controller.enterCity(enterComplete);
    vi.runAllTimers();
    expect(timelines[0]?.durations).toEqual([0.2, 0.75]);
    expect(enterComplete).toHaveBeenCalledTimes(1);

    const approachComplete = vi.fn();
    controller.approachSite(approachComplete);
    vi.runAllTimers();
    expect(timelines[1]?.durations).toEqual([0.36, 0.65]);
    expect(approachComplete).toHaveBeenCalledTimes(1);

    const returnComplete = vi.fn();
    controller.returnFromSite(returnComplete);
    vi.runAllTimers();
    expect(timelines[2]?.durations).toEqual([0.55]);
    expect(returnComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels an old timeline so it cannot complete or change adapter state', () => {
    const { adapter, controller, timelines } = createHarness();
    const onComplete = vi.fn();
    controller.enterCity(onComplete);
    controller.cancel();
    vi.runAllTimers();

    expect(timelines[0]?.killCalls).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(adapter.scales).toEqual([1]);
  });

  it('completes reduced motion without changing spatial scale', () => {
    const { adapter, controller, timelines } = createHarness(true);
    const onComplete = vi.fn();
    controller.approachSite(onComplete);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(adapter.scales).toEqual([]);
    expect(timelines).toHaveLength(0);
  });
});
