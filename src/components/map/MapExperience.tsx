import { useEffect, useRef } from 'react';

import type { Site } from '../../data/siteSchema';
import useReducedMotion from '../../hooks/useReducedMotion';
import CityMap from './CityMap';
import type { CityId } from './cityMapConfig';
import {
  createMapMotionController,
  type MapMotionAdapter,
  type MapMotionController,
} from './mapMotion';
import NationalMap from './NationalMap';
import './map.css';

export type MapExperienceState =
  | { view: 'national' }
  | { view: 'entering-city'; cityId: CityId }
  | { view: 'city'; cityId: CityId }
  | { view: 'travelling-site'; cityId: CityId; siteId: string }
  | { view: 'returning-site'; cityId: CityId; siteId: string };

export type MapExperienceEvent =
  | { type: 'SELECT_CITY'; cityId: CityId }
  | { type: 'CITY_ENTERED' }
  | { type: 'SELECT_SITE'; siteId: string }
  | { type: 'SITE_REACHED' }
  | { type: 'SITE_RETURNED' }
  | { type: 'BACK_TO_NATIONAL' };

type MotionControllerFactory = (
  adapter: MapMotionAdapter,
  options: { reducedMotion: boolean },
) => MapMotionController;

type MapExperienceProps = {
  motionControllerFactory?: MotionControllerFactory;
  onEvent: (event: MapExperienceEvent) => void;
  sites: ReadonlyArray<Site>;
  state: MapExperienceState;
};

export default function MapExperience({
  motionControllerFactory = createMapMotionController,
  onEvent,
  sites,
  state,
}: MapExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (
      state.view !== 'entering-city' &&
      state.view !== 'travelling-site' &&
      state.view !== 'returning-site'
    ) {
      return;
    }

    let active = true;
    const adapter: MapMotionAdapter = {
      setPhase: (phase) => {
        if (rootRef.current) rootRef.current.dataset.motionPhase = phase;
      },
      setMotionScale: (scale) => {
        rootRef.current?.style.setProperty('--motion-scale', String(scale));
      },
    };
    const controller = motionControllerFactory(adapter, { reducedMotion });
    const complete = (event: MapExperienceEvent) => () => {
      if (active) onEvent(event);
    };

    if (state.view === 'entering-city') {
      controller.enterCity(complete({ type: 'CITY_ENTERED' }));
    } else if (state.view === 'travelling-site') {
      controller.approachSite(complete({ type: 'SITE_REACHED' }));
    } else {
      controller.returnFromSite(complete({ type: 'SITE_RETURNED' }));
    }

    return () => {
      active = false;
      controller.cancel();
    };
  }, [motionControllerFactory, onEvent, reducedMotion, state]);

  const cityState = state.view !== 'national' && state.view !== 'entering-city';
  const cityId = state.view === 'national' ? null : state.cityId;
  const selectedSiteId =
    state.view === 'travelling-site' || state.view === 'returning-site'
      ? state.siteId
      : null;
  const transitioning = state.view !== 'national' && state.view !== 'city';

  return (
    <div
      className="map-experience"
      data-motion-phase="idle"
      ref={rootRef}
    >
      {cityState && cityId ? (
        <CityMap
          cityId={cityId}
          disabled={transitioning}
          onBack={() => onEvent({ type: 'BACK_TO_NATIONAL' })}
          onSelectSite={(siteId) => onEvent({ type: 'SELECT_SITE', siteId })}
          selectedSiteId={selectedSiteId}
          sites={sites}
        />
      ) : (
        <NationalMap
          disabled={state.view === 'entering-city'}
          onSelectCity={(selectedCityId) =>
            onEvent({ type: 'SELECT_CITY', cityId: selectedCityId })
          }
        />
      )}
    </div>
  );
}
