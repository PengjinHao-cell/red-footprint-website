import { gsap } from 'gsap';

export interface MapMotionAdapter {
  setPhase(phase: string): void;
  setMotionScale(scale: number): void;
}

export type MapMotionTween = {
  duration: number;
  onUpdate?: () => void;
  [property: string]: number | (() => void) | undefined;
};

export interface MapMotionTimeline {
  to(target: Record<string, number>, tween: MapMotionTween): this;
  call(callback: () => void): this;
  kill(): void;
}

export type MapMotionController = {
  approachSite(onComplete: () => void): void;
  cancel(): void;
  enterCity(onComplete: () => void): void;
  returnFromSite(onComplete: () => void): void;
};

type MapMotionOptions = {
  reducedMotion?: boolean | (() => boolean);
  timelineFactory?: () => MapMotionTimeline;
};

type MotionStep = {
  duration: number;
  phase: string;
  scale: number;
};

const ENTER_CITY_STEPS: MotionStep[] = [
  { duration: 0.2, phase: 'city-flash', scale: 1.02 },
  { duration: 0.75, phase: 'entering-city', scale: 1.12 },
];
const APPROACH_SITE_STEPS: MotionStep[] = [
  { duration: 0.36, phase: 'site-bounce', scale: 1.04 },
  { duration: 0.65, phase: 'approaching-site', scale: 1.35 },
];
const RETURN_SITE_STEPS: MotionStep[] = [
  { duration: 0.55, phase: 'returning-site', scale: 1 },
];

function createGsapTimeline(): MapMotionTimeline {
  return gsap.timeline() as unknown as MapMotionTimeline;
}

export function createMapMotionController(
  adapter: MapMotionAdapter,
  options: MapMotionOptions = {},
): MapMotionController {
  const timelineFactory = options.timelineFactory ?? createGsapTimeline;
  let activeTimeline: MapMotionTimeline | null = null;
  let operation = 0;
  let scale = 1;

  const prefersReducedMotion = () =>
    typeof options.reducedMotion === 'function'
      ? options.reducedMotion()
      : (options.reducedMotion ?? false);

  function run(steps: MotionStep[], onComplete: () => void): void {
    if (activeTimeline) return;
    const activeOperation = ++operation;
    let completed = false;

    if (prefersReducedMotion()) {
      adapter.setPhase('idle');
      onComplete();
      return;
    }

    const value: Record<string, number> = { scale };
    const timeline = timelineFactory();
    activeTimeline = timeline;

    adapter.setPhase(steps[0]?.phase ?? 'idle');
    steps.forEach((step, index) => {
      timeline.to(value, {
        duration: step.duration,
        scale: step.scale,
        onUpdate: () => {
          if (activeOperation !== operation) return;
          scale = value.scale;
          adapter.setMotionScale(scale);
        },
      });
      const nextStep = steps[index + 1];
      if (nextStep) {
        timeline.call(() => {
          if (activeOperation === operation) adapter.setPhase(nextStep.phase);
        });
      }
    });

    timeline.call(() => {
      if (completed || activeOperation !== operation) return;
      completed = true;
      activeTimeline = null;
      adapter.setPhase('idle');
      onComplete();
    });
  }

  function cancel(): void {
    operation += 1;
    activeTimeline?.kill();
    activeTimeline = null;
    scale = 1;
    adapter.setMotionScale(1);
    adapter.setPhase('idle');
  }

  return {
    approachSite: (onComplete) => run(APPROACH_SITE_STEPS, onComplete),
    cancel,
    enterCity: (onComplete) => run(ENTER_CITY_STEPS, onComplete),
    returnFromSite: (onComplete) => run(RETURN_SITE_STEPS, onComplete),
  };
}
