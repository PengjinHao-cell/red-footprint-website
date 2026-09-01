import { readFileSync } from 'node:fs';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema } from '../../data/siteSchema';
import MapExperience from './MapExperience';
import type { MapMotionController } from './mapMotion';

const sites = siteSchema.array().parse(
  JSON.parse(readFileSync('src/data/sites.json', 'utf8')),
);

function controllerHarness() {
  const callbacks: Array<() => void> = [];
  const controller: MapMotionController = {
    approachSite: (onComplete) => callbacks.push(onComplete),
    cancel: vi.fn(),
    enterCity: (onComplete) => callbacks.push(onComplete),
    returnFromSite: (onComplete) => callbacks.push(onComplete),
  };
  return { callbacks, controller, factory: vi.fn(() => controller) };
}

afterEach(cleanup);

describe('MapExperience', () => {
  it('emits city selection and renders the selected city layer', () => {
    const onEvent = vi.fn();
    const motion = controllerHarness();
    const { rerender } = render(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'national' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '进入南京市' }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'SELECT_CITY', cityId: 'nanjing' });

    rerender(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'city', cityId: 'nanjing' }}
      />,
    );
    expect(screen.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  });

  it('completes each transition with the matching event', () => {
    const onEvent = vi.fn();
    const motion = controllerHarness();
    const { rerender } = render(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'entering-city', cityId: 'nanjing' }}
      />,
    );
    motion.callbacks.shift()?.();
    expect(onEvent).toHaveBeenCalledWith({ type: 'CITY_ENTERED' });

    rerender(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'travelling-site', cityId: 'nanjing', siteId: 'yuhuatai-martyrs' }}
      />,
    );
    motion.callbacks.shift()?.();
    expect(onEvent).toHaveBeenCalledWith({ type: 'SITE_REACHED' });

    rerender(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'returning-site', cityId: 'nanjing', siteId: 'yuhuatai-martyrs' }}
      />,
    );
    motion.callbacks.shift()?.();
    expect(onEvent).toHaveBeenCalledWith({ type: 'SITE_RETURNED' });
  });

  it('cancels the controller on unmount so no completion event is sent', () => {
    const onEvent = vi.fn();
    const motion = controllerHarness();
    const { unmount } = render(
      <MapExperience
        motionControllerFactory={motion.factory}
        onEvent={onEvent}
        sites={sites}
        state={{ view: 'entering-city', cityId: 'nanjing' }}
      />,
    );
    const staleComplete = motion.callbacks[0];
    unmount();
    staleComplete?.();

    expect(motion.controller.cancel).toHaveBeenCalledTimes(1);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
