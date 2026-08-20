import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import JourneyProgress from './JourneyProgress';

afterEach(cleanup);

describe('JourneyProgress', () => {
  it('shows three of eight visits as visible text and a native progress bar', () => {
    render(<JourneyProgress visitedCount={3} />);

    expect(screen.getByText('已点亮 3 / 8 处红色坐标')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '8');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '3');
  });

  it('gives the progress bar an accessible name', () => {
    render(<JourneyProgress visitedCount={3} />);

    expect(
      screen.getByRole('progressbar', {
        name: '已点亮 3 / 8 处红色坐标',
      }),
    ).toBeInTheDocument();
  });
});
