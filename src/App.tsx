import { useCallback, useEffect, useReducer } from 'react';

import AppErrorBoundary from './components/AppErrorBoundary';
import SiteDetailPanel from './components/detail/SiteDetailPanel';
import SiteDirectory from './components/directory/SiteDirectory';
import {
  initialExperienceState,
  transition,
} from './components/map/experienceState';
import MapExperience, {
  type MapExperienceEvent,
  type MapExperienceState,
} from './components/map/MapExperience';
import JourneyProgress from './components/progress/JourneyProgress';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import type { Site } from './data/siteSchema';
import useJourneyProgress from './hooks/useJourneyProgress';

type AppProps = {
  sites?: ReadonlyArray<Site>;
};

export default function App({ sites }: AppProps) {
  const [experience, dispatch] = useReducer(transition, initialExperienceState);
  const { markVisited, visitedIds } = useJourneyProgress();

  const selectedSite =
    sites?.find(({ id }) => id === ('siteId' in experience ? experience.siteId : null)) ?? null;

  useEffect(() => {
    if (experience.view === 'detail') markVisited(experience.siteId);
  }, [experience, markVisited]);

  const handleMapEvent = useCallback(
    (event: MapExperienceEvent) => {
      if (
        event.type === 'SELECT_SITE' &&
        !sites?.some((site) => site.id === event.siteId)
      ) {
        return;
      }
      dispatch(event);
    },
    [sites],
  );

  const openDirectoryDetail = useCallback(
    (id: string) => {
      if (!sites?.some((site) => site.id === id)) {
        return;
      }

      dispatch({ type: 'OPEN_DIRECTORY_DETAIL', siteId: id });
    },
    [sites],
  );

  const closeDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
  }, []);

  const resetMap = useCallback(() => {
    dispatch({ type: 'RESET_MAP' });
  }, []);

  if (!sites?.length) {
    return (
      <main
        style={{
          display: 'grid',
          minHeight: '100vh',
          placeItems: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div>
          <h1>青春寻访·红色足迹</h1>
          <p role="alert">内容资料尚未通过发布门禁，当前不会展示未经核验的景点资料。</p>
        </div>
      </main>
    );
  }

  if (experience.view === 'welcome') {
    return (
      <WelcomeScreen
        onEnter={() => dispatch({ type: 'RESET_MAP' })}
        ready
      />
    );
  }

  return (
    <AppErrorBoundary onReset={resetMap}>
      <main
        style={{
          minHeight: '100vh',
          padding: 'clamp(1rem, 3vw, 2rem)',
          background: '#fbf7ee',
        }}
      >
        <JourneyProgress visitedCount={visitedIds.length} />

        <MapExperience
          onEvent={handleMapEvent}
          sites={sites}
          state={(
            experience.view === 'detail'
              ? experience.origin === 'city-map' && experience.cityId
                ? { view: 'city', cityId: experience.cityId }
                : { view: 'national' }
              : experience.view === 'returning-national'
                ? { view: 'national' }
                : experience
          ) as MapExperienceState}
        />

        {experience.view === 'national' && (
          <>
            <SiteDirectory
              onOpen={openDirectoryDetail}
              sites={sites}
              visitedIds={visitedIds}
            />
          </>
        )}

        {experience.view === 'detail' && selectedSite && (
          <SiteDetailPanel
            key={selectedSite.id}
            onClose={closeDetail}
            site={selectedSite}
          />
        )}
      </main>
    </AppErrorBoundary>
  );
}
