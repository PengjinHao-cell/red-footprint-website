import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GlobeLoadingPlaceholder from './GlobeLoadingPlaceholder';

afterEach(cleanup);

describe('GlobeLoadingPlaceholder', () => {
  it('announces the loading state and renders a decorative outline', () => {
    render(<GlobeLoadingPlaceholder />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '正在准备长三角红色足迹',
    );
    expect(screen.getByLabelText('长三角地图加载占位')).toBeVisible();
  });

  it('renders the accessible preparation progress bar', () => {
    render(<GlobeLoadingPlaceholder progress={75} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('75%')).toBeVisible();
    expect(screen.getByText(/正在准备长三角红色足迹/)).toBeVisible();
  });

  it('renders five decorative stars and a breathing glow with full motion', () => {
    const { container } = render(<GlobeLoadingPlaceholder />);

    expect(container.querySelector('.globe-placeholder__glow')).not.toBeNull();
    expect(container.querySelectorAll('.globe-placeholder__star')).toHaveLength(
      5,
    );
    expect(
      container.querySelectorAll('.globe-placeholder__star[aria-hidden="true"]')
        .length,
    ).toBe(5);
    expect(container.querySelector('.globe-placeholder')).toHaveAttribute(
      'data-motion',
      'full',
    );
  });

  it('keeps a static outline under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    }));
    const { container } = render(<GlobeLoadingPlaceholder />);

    expect(container.querySelector('.globe-placeholder')).toHaveAttribute(
      'data-motion',
      'reduced',
    );
    vi.unstubAllGlobals();
  });
});
