import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Site } from '../../data/siteSchema';
import CityStarMarker from './CityStarMarker';

const site = {
  id: 'yuhuatai-martyrs',
  officialName: '雨花台烈士陵园',
  shortName: '雨花台烈士陵园',
} as Site;

afterEach(cleanup);

describe('CityStarMarker', () => {
  it('keeps geographic positioning on the outer button and animation on the inner shape', () => {
    const { container } = render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );

    const marker = screen.getByRole('button', { name: site.officialName });
    expect(marker).toHaveStyle({ left: '320px', top: '180px' });
    expect(marker).toHaveAttribute('data-anchor-x', '320');
    expect(marker).toHaveAttribute('data-anchor-y', '180');
    expect(marker).not.toHaveClass('city-star__shape');
    expect(container.querySelector('.city-star__shape')).not.toBeNull();
  });

  it('selects the exact site once and supports a disabled transition state', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <CityStarMarker
        disabled={false}
        onSelect={onSelect}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: site.officialName }));
    expect(onSelect).toHaveBeenCalledWith(site.id);

    rerender(
      <CityStarMarker
        disabled
        onSelect={onSelect}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: site.officialName }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('uses a deterministic negative animation delay and a stable selected anchor', () => {
    const { container, rerender } = render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        phaseIndex={3}
        point={{ x: 320, y: 180 }}
        selected={false}
        site={site}
      />,
    );
    const marker = screen.getByRole('button', { name: site.officialName });
    const initialStyle = marker.getAttribute('style');
    expect(container.querySelector('.city-star__shape')).toHaveStyle({ animationDelay: '-0.51s' });

    rerender(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        phaseIndex={3}
        point={{ x: 320, y: 180 }}
        selected
        site={site}
      />,
    );
    expect(marker).toHaveAttribute('data-selected', 'true');
    expect(marker.getAttribute('style')).toBe(initialStyle);
  });

  it('converts calibrated pixels into responsive percentages without moving the anchor', () => {
    render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        placement="responsive"
        point={{ x: 250, y: 400 }}
        site={site}
        viewBox={{ width: 1000, height: 800 }}
      />,
    );

    const marker = screen.getByRole('button', { name: site.officialName });
    expect(marker).toHaveStyle({ left: '25%', top: '50%' });
    expect(marker).toHaveAttribute('data-anchor-x', '250');
    expect(marker).toHaveAttribute('data-anchor-y', '400');
  });
});
