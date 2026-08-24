import { useEffect, useState } from 'react';

import useReducedMotion from '../../hooks/useReducedMotion';
import { prefetchGlobeModule, scheduleIdleTask } from './globePrefetch';
import WelcomeRoute from './WelcomeRoute';

const SEEN_STORAGE_KEY = 'red-footprint:welcome-seen:v1';

type WelcomeScreenProps = {
  ready: boolean;
  onEnter: () => void;
};

function readSeenFlag(): boolean {
  if (typeof window === 'undefined' || typeof window.sessionStorage !== 'object') {
    return false;
  }
  return window.sessionStorage.getItem(SEEN_STORAGE_KEY) === '1';
}

export default function WelcomeScreen({
  ready,
  onEnter,
}: WelcomeScreenProps) {
  const reducedMotion = useReducedMotion();
  const [seenBefore, setSeenBefore] = useState(readSeenFlag);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const cancel = scheduleIdleTask(() => {
      prefetchGlobeModule().catch((error: unknown) => {
        console.warn('globe.gl prefetch failed', error);
      });
    });

    return cancel;
  }, []);

  const handleEnter = () => {
    if (typeof window !== 'undefined' && typeof window.sessionStorage === 'object') {
      window.sessionStorage.setItem(SEEN_STORAGE_KEY, '1');
    }
    setSeenBefore(true);
    setEntered(true);
    onEnter();
  };

  const motion = reducedMotion ? 'reduced' : 'full';
  const variant = seenBefore || entered ? 'short' : 'full';

  return (
    <main className="welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-screen__content">
        {!entered && (
          <WelcomeRoute motion={motion} variant={variant} />
        )}
        <div className="welcome-screen__seal" aria-hidden="true">
          红迹
        </div>
        <p className="welcome-screen__subtitle">
          南京晓庄学院暑期社会实践成果展示
        </p>
        <h1 className="welcome-screen__title" id="welcome-title">
          <span className="welcome-screen__title-line">青春寻访</span>
          <span className="welcome-screen__title-line">红色足迹</span>
        </h1>
        <p className="welcome-screen__guide">
          循着历史足迹，走进长三角红色地标
        </p>
        {!ready && (
          <p className="welcome-screen__status" role="status">
            正在载入实践足迹
          </p>
        )}
        <button
          className="welcome-screen__button"
          disabled={!ready}
          onClick={handleEnter}
          type="button"
        >
          开启寻访
        </button>
      </div>
    </main>
  );
}
