import { gsap } from 'gsap';

import type { Site } from '../../data/siteSchema';

export type CameraFlightState =
  | 'idle'
  | 'departing'
  | 'arriving'
  | 'open'
  | 'returning';

export type CameraView = {
  lat: number;
  lng: number;
  altitude: number;
};

export interface CameraAdapter {
  getView(): CameraView;
  setView(view: CameraView): void;
  setOpacity(opacity: number): void;
}

export type CameraFlightTween = {
  duration: number;
  onUpdate?: () => void;
  [property: string]: number | (() => void) | undefined;
};

export interface CameraFlightTimeline {
  to(target: Record<string, number>, tween: CameraFlightTween): this;
  call(callback: () => void): this;
  kill(): void;
}

type CameraFlightOptions = {
  reducedMotion?: boolean;
  onOpen?: (site: Site) => void;
  onStateChange?: (state: CameraFlightState) => void;
  timelineFactory?: () => CameraFlightTimeline;
};

export type CameraFlightController = {
  flyTo(site: Site): void;
  returnToOverview(): void;
  cancel(): void;
  getState(): CameraFlightState;
};

const DEPART_DURATION = 0.45;
const ROTATE_DURATION = 0.95;
const ARRIVE_DURATION = 0.7;
const RETURN_DURATION = 0.9;
const FADE_DURATION = 0.12;
const DEPART_ALTITUDE = 2.2;
const ARRIVE_ALTITUDE = 0.65;

function createGsapTimeline(): CameraFlightTimeline {
  return gsap.timeline() as unknown as CameraFlightTimeline;
}

function toCameraView(target: Record<string, number>): CameraView {
  return {
    lat: target.lat,
    lng: target.lng,
    altitude: target.altitude,
  };
}

export function createCameraFlightController(
  adapter: CameraAdapter,
  options: CameraFlightOptions = {},
): CameraFlightController {
  const overview = adapter.getView();
  const timelineFactory = options.timelineFactory ?? createGsapTimeline;
  let state: CameraFlightState = 'idle';
  let activeTimeline: CameraFlightTimeline | null = null;
  let operation = 0;

  function setState(nextState: CameraFlightState): void {
    if (state === nextState) {
      return;
    }

    state = nextState;
    options.onStateChange?.(state);
  }

  function guard(activeOperation: number, callback: () => void) {
    return () => {
      if (activeOperation === operation) {
        callback();
      }
    };
  }

  function flyWithReducedMotion(site: Site, activeOperation: number): void {
    const fade = { opacity: 1 };
    const timeline = timelineFactory();
    activeTimeline = timeline;

    timeline
      .to(fade, {
        opacity: 0,
        duration: FADE_DURATION,
        onUpdate: () => adapter.setOpacity(fade.opacity),
      })
      .call(guard(activeOperation, () => setState('arriving')))
      .to(fade, {
        opacity: 1,
        duration: FADE_DURATION,
        onUpdate: () => adapter.setOpacity(fade.opacity),
      })
      .call(
        guard(activeOperation, () => {
          activeTimeline = null;
          setState('open');
          options.onOpen?.(site);
        }),
      );
  }

  function flyWithSpatialMotion(site: Site, activeOperation: number): void {
    const view: Record<string, number> = { ...adapter.getView() };
    const updateView = () => adapter.setView(toCameraView(view));
    const timeline = timelineFactory();
    activeTimeline = timeline;

    timeline
      .to(view, {
        altitude: DEPART_ALTITUDE,
        duration: DEPART_DURATION,
        onUpdate: updateView,
      })
      .call(guard(activeOperation, () => setState('arriving')))
      .to(view, {
        lat: site.coordinates.lat,
        lng: site.coordinates.lng,
        duration: ROTATE_DURATION,
        onUpdate: updateView,
      })
      .to(view, {
        altitude: ARRIVE_ALTITUDE,
        duration: ARRIVE_DURATION,
        onUpdate: updateView,
      })
      .call(
        guard(activeOperation, () => {
          activeTimeline = null;
          setState('open');
          options.onOpen?.(site);
        }),
      );
  }

  function flyTo(site: Site): void {
    if (state !== 'idle') {
      return;
    }

    const activeOperation = ++operation;
    setState('departing');

    if (options.reducedMotion) {
      flyWithReducedMotion(site, activeOperation);
      return;
    }

    flyWithSpatialMotion(site, activeOperation);
  }

  function returnToOverview(): void {
    if (state !== 'open') {
      return;
    }

    const activeOperation = ++operation;
    setState('returning');
    const timeline = timelineFactory();
    activeTimeline = timeline;

    if (options.reducedMotion) {
      const fade = { opacity: 1 };
      timeline
        .to(fade, {
          opacity: 0,
          duration: FADE_DURATION,
          onUpdate: () => adapter.setOpacity(fade.opacity),
        })
        .to(fade, {
          opacity: 1,
          duration: FADE_DURATION,
          onUpdate: () => adapter.setOpacity(fade.opacity),
        })
        .call(
          guard(activeOperation, () => {
            activeTimeline = null;
            setState('idle');
          }),
        );
      return;
    }

    const view: Record<string, number> = { ...adapter.getView() };
    timeline
      .to(view, {
        ...overview,
        duration: RETURN_DURATION,
        onUpdate: () => adapter.setView(toCameraView(view)),
      })
      .call(
        guard(activeOperation, () => {
          activeTimeline = null;
          setState('idle');
        }),
      );
  }

  function cancel(): void {
    operation += 1;
    activeTimeline?.kill();
    activeTimeline = null;
    setState('idle');
  }

  function getState(): CameraFlightState {
    return state;
  }

  return { flyTo, returnToOverview, cancel, getState };
}
