import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WelcomeScreen from './WelcomeScreen';

const globePrefetch = vi.hoisted(() => ({
  loadCount: 0,
  rejectNext: false,
}));

vi.mock('globe.gl', () => {
  globePrefetch.loadCount += 1;
  if (globePrefetch.rejectNext) {
    throw new Error('synthetic prefetch failure');
  }
  return { default: class MockPrefetchedGlobe {} };
});

afterEach(() => {
  cleanup();
  globePrefetch.loadCount = 0;
  globePrefetch.rejectNext = false;
  vi.restoreAllMocks();
});

function stubIdleCallbackImmediate() {
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    callback();
    return 0;
  });
  vi.stubGlobal('cancelIdleCallback', () => undefined);
}

describe('WelcomeScreen', () => {
  it('shows the approved school subtitle', () => {
    render(<WelcomeScreen ready={false} onEnter={() => undefined} />);

    expect(
      screen.getByText('南京晓庄学院暑期社会实践成果展示'),
    ).toBeVisible();
  });

  it('disables entry while the experience is not ready', () => {
    render(<WelcomeScreen ready={false} onEnter={() => undefined} />);

    expect(screen.getByRole('button', { name: '开启寻访' })).toBeDisabled();
  });

  it('announces the loading state while the experience is not ready', () => {
    render(<WelcomeScreen ready={false} onEnter={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('正在载入实践足迹');
  });

  it('enables entry when the experience is ready', () => {
    render(<WelcomeScreen ready onEnter={() => undefined} />);

    expect(screen.getByRole('button', { name: '开启寻访' })).toBeEnabled();
  });

  it('calls onEnter exactly once when the enabled button is clicked', () => {
    const onEnter = vi.fn();
    render(<WelcomeScreen ready onEnter={onEnter} />);

    fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('renders the journey route animation while keeping entry enabled', () => {
    render(<WelcomeScreen ready onEnter={() => undefined} />);

    expect(screen.getByLabelText('红色足迹路线动画')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开启寻访' })).toBeEnabled();
  });

  it('marks the animation container reduced and keeps entry usable', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    }));
    const onEnter = vi.fn();
    const { container } = render(<WelcomeScreen ready onEnter={onEnter} />);

    expect(container.querySelector('[data-motion="reduced"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('prefetches the globe module in idle time without blocking entry', async () => {
    stubIdleCallbackImmediate();
    const onEnter = vi.fn();
    render(<WelcomeScreen ready onEnter={onEnter} />);

    await waitFor(() => expect(globePrefetch.loadCount).toBe(1));
    expect(screen.getByRole('button', { name: '开启寻访' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('keeps entry usable when the prefetch itself fails', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    stubIdleCallbackImmediate();
    vi.resetModules();
    vi.doMock('globe.gl', () => {
      globePrefetch.loadCount += 1;
      throw new Error('synthetic prefetch failure');
    });
    const { default: ReloadedWelcomeScreen } = await import('./WelcomeScreen');

    const onEnter = vi.fn();
    render(<ReloadedWelcomeScreen ready onEnter={onEnter} />);

    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '开启寻访' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('removes the seal and lays the welcome screen out in the approved order', () => {
    const { container } = render(<WelcomeScreen ready onEnter={() => undefined} />);

    expect(container.querySelector('.welcome-screen__seal')).toBeNull();

    const content = container.querySelector('.welcome-screen__content');
    expect(
      [...(content?.children ?? [])].map((element) => element.className),
    ).toEqual([
      'welcome-screen__subtitle',
      'welcome-screen__title',
      'welcome-screen__guide',
      'welcome-route',
      'welcome-screen__button',
    ]);
  });

  it('plays the full route animation again even when the old seen flag is present', () => {
    vi.unstubAllGlobals();
    window.sessionStorage.setItem('red-footprint:welcome-seen:v1', '1');
    const { container } = render(<WelcomeScreen ready onEnter={() => undefined} />);

    const route = container.querySelector('.welcome-route');
    expect(route).not.toBeNull();
    expect(route?.getAttribute('data-variant')).toBeNull();
    expect(route?.getAttribute('data-motion')).toBe('full');
  });
});
