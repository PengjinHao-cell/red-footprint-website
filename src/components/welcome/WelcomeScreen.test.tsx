import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WelcomeScreen from './WelcomeScreen';

afterEach(cleanup);

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
});
