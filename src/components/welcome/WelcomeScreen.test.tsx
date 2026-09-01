import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WelcomeScreen from './WelcomeScreen';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
