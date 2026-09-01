import { useCallback, useReducer, useState } from 'react';

import AppErrorBoundary from './components/AppErrorBoundary';
import SiteDetailPanel from './components/detail/SiteDetailPanel';
import SiteDirectory from './components/directory/SiteDirectory';
import ProgressiveGlobe from './components/globe/ProgressiveGlobe';
import {
  initialExperienceState,
  transition,
} from './components/map/experienceState';
import JourneyProgress from './components/progress/JourneyProgress';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import type { Site } from './data/siteSchema';
import useJourneyProgress from './hooks/useJourneyProgress';

type AppProps = {
  sites?: ReadonlyArray<Site>;
};

export default function App({ sites }: AppProps) {
  const [experience, dispatch] = useReducer(transition, initialExperienceState);
  const [globeRetryKey, setGlobeRetryKey] = useState(0);
  const { markVisited, visitedIds } = useJourneyProgress();

  const selectedSite =
    sites?.find(({ id }) => id === experience.siteId) ?? null;

  const selectSite = useCallback(
    (id: string) => {
      if (experience.view !== 'national' || !sites?.some((site) => site.id === id)) {
        return;
      }

      dispatch({ type: 'SELECT_SITE', siteId: id });
    },
    [experience.view, sites],
  );

  const openDetail = useCallback(
    (id: string) => {
      if (!sites?.some((site) => site.id === id)) {
        return;
      }

      markVisited(id);
      dispatch({ type: 'TRAVEL_COMPLETE' });
    },
    [markVisited, sites],
  );

  const openDirectoryDetail = useCallback(
    (id: string) => {
      if (!sites?.some((site) => site.id === id)) {
        return;
      }

      markVisited(id);
      dispatch({ type: 'OPEN_DIRECTORY_DETAIL', siteId: id });
    },
    [markVisited, sites],
  );

  const finishReturn = useCallback(() => {
    dispatch({ type: 'RETURN_COMPLETE' });
  }, []);

  const closeDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
  }, []);

  const retryGlobe = useCallback(() => {
    dispatch({ type: 'RESET_MAP' });
    setGlobeRetryKey((key) => key + 1);
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
    <AppErrorBoundary onReset={retryGlobe}>
      <main
        style={{
          minHeight: '100vh',
          padding: 'clamp(1rem, 3vw, 2rem)',
          background: '#fbf7ee',
        }}
      >
        <JourneyProgress visitedCount={visitedIds.length} />

        {(experience.view === 'travelling-site' ||
          experience.view === 'returning-national') &&
          selectedSite && (
            <p aria-live="polite" role="status">
              正在调整地图视角：{selectedSite.officialName}
            </p>
          )}

        <ProgressiveGlobe
          detailOpen={experience.view === 'detail'}
          key={globeRetryKey}
          onReturnComplete={finishReturn}
          onSelect={selectSite}
          onTravelComplete={openDetail}
          selectedId={experience.siteId ?? null}
          sites={sites}
          visitedIds={visitedIds}
        />

        {experience.view === 'national' && (
          <>
            <button onClick={retryGlobe} type="button">
              重新加载3D地图
            </button>
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
