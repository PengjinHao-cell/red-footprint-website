import { useEffect } from 'react';

import useReducedMotion from '../../hooks/useReducedMotion';
import { prefetchGlobeModule, scheduleIdleTask } from './globePrefetch';
import WelcomeRoute from './WelcomeRoute';

type WelcomeScreenProps = {
  ready: boolean;
  onEnter: () => void;
};

export default function WelcomeScreen({
  ready,
  onEnter,
}: WelcomeScreenProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const cancel = scheduleIdleTask(() => {
      prefetchGlobeModule().catch((error: unknown) => {
        console.warn('globe.gl prefetch failed', error);
      });
    });

    return cancel;
  }, []);

  const motion = reducedMotion ? 'reduced' : 'full';

  return (
    <main className="welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-screen__content">
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
        <WelcomeRoute motion={motion} />
        {!ready && (
          <p className="welcome-screen__status" role="status">
            正在载入实践足迹
          </p>
        )}
        <button
          className="welcome-screen__button"
          disabled={!ready}
          onClick={onEnter}
          type="button"
        >
          开启寻访
        </button>
      </div>
    </main>
  );
}
