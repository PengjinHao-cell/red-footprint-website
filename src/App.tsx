import { useCallback, useState } from 'react';

import AppErrorBoundary from './components/AppErrorBoundary';
import SiteDetailPanel from './components/detail/SiteDetailPanel';
import SiteDirectory from './components/directory/SiteDirectory';
import ProgressiveGlobe from './components/globe/ProgressiveGlobe';
import JourneyProgress from './components/progress/JourneyProgress';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import type { Site } from './data/siteSchema';
import useJourneyProgress from './hooks/useJourneyProgress';

type PageState = 'welcome' | 'map' | 'travelling' | 'detail';

type AppProps = {
  sites?: ReadonlyArray<Site>;
};

export default function App({ sites }: AppProps) {
  const [pageState, setPageState] = useState<PageState>('welcome');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [globeRetryKey, setGlobeRetryKey] = useState(0);
  const { markVisited, visitedIds } = useJourneyProgress();

  const selectedSite =
    sites?.find(({ id }) => id === selectedSiteId) ?? null;

  const selectSite = useCallback(
    (id: string) => {
      if (pageState !== 'map' || !sites?.some((site) => site.id === id)) {
        return;
      }

      setSelectedSiteId(id);
      setPageState('travelling');
    },
    [pageState, sites],
  );

  const openDetail = useCallback(
    (id: string) => {
      if (!sites?.some((site) => site.id === id)) {
        return;
      }

      setSelectedSiteId(id);
      markVisited(id);
      setPageState('detail');
    },
    [markVisited, sites],
  );

  const finishReturn = useCallback(() => {
    setSelectedSiteId(null);
    setPageState('map');
  }, []);

  const retryGlobe = useCallback(() => {
    setSelectedSiteId(null);
    setPageState('map');
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

  if (pageState === 'welcome') {
    return <WelcomeScreen onEnter={() => setPageState('map')} ready />;
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

        {pageState === 'travelling' && selectedSite && (
          <p aria-live="polite" role="status">
            正在调整地图视角：{selectedSite.officialName}
          </p>
        )}

        <ProgressiveGlobe
          detailOpen={pageState === 'detail'}
          key={globeRetryKey}
          onReturnComplete={finishReturn}
          onSelect={selectSite}
          onTravelComplete={openDetail}
          selectedId={selectedSiteId}
          sites={sites}
          visitedIds={visitedIds}
        />

        {pageState === 'map' && (
          <>
            <button onClick={retryGlobe} type="button">
              重新加载3D地图
            </button>
            <SiteDirectory
              onOpen={openDetail}
              sites={sites}
              visitedIds={visitedIds}
            />
          </>
        )}

        {pageState === 'detail' && selectedSite && (
          <SiteDetailPanel
            key={selectedSite.id}
            onClose={() => setPageState('travelling')}
            site={selectedSite}
          />
        )}
      </main>
    </AppErrorBoundary>
  );
}
