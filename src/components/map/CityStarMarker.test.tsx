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
  it('keeps geographic positioning on the container and animation on the inner shape', () => {
    const { container } = render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );

    const marker = container.querySelector('.city-star');
    expect(marker).toHaveStyle({ left: '320px', top: '180px' });
    expect(marker).toHaveAttribute('data-anchor-x', '320');
    expect(marker).toHaveAttribute('data-anchor-y', '180');
    expect(marker).not.toHaveClass('city-star__shape');
    expect(container.querySelector('.city-star__shape')).not.toBeNull();
  });

  it('marks the visual SVG as aria-hidden and gives both targets clear names', () => {
    const { container } = render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );

    expect(container.querySelector('.city-star__shape svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(
      screen.getByRole('button', { name: '定位并查看雨花台烈士陵园' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: '雨花台烈士陵园', exact: true }),
    ).toBeVisible();
  });

  it('selects the same site from the star hit target and the name button', () => {
    const onSelect = vi.fn();
    render(
      <CityStarMarker
        disabled={false}
        onSelect={onSelect}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '定位并查看雨花台烈士陵园' }));
    fireEvent.click(screen.getByRole('button', { name: '雨花台烈士陵园', exact: true }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, site.id);
    expect(onSelect).toHaveBeenNthCalledWith(2, site.id);
  });

  it('supports a disabled transition state across both targets', () => {
    const onSelect = vi.fn();
    render(
      <CityStarMarker
        disabled
        onSelect={onSelect}
        point={{ x: 320, y: 180 }}
        site={site}
      />,
    );

    expect(screen.getByRole('button', { name: '定位并查看雨花台烈士陵园' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '雨花台烈士陵园', exact: true })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '雨花台烈士陵园', exact: true }));
    expect(onSelect).not.toHaveBeenCalled();
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
    const marker = container.querySelector('.city-star');
    const initialStyle = marker?.getAttribute('style');
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
    expect(container.querySelector('.city-star')).toHaveAttribute('data-selected', 'true');
    expect(container.querySelector('.city-star')?.getAttribute('style')).toBe(initialStyle);
  });

  it('converts calibrated pixels into responsive percentages without moving the anchor', () => {
    const { container } = render(
      <CityStarMarker
        disabled={false}
        onSelect={vi.fn()}
        placement="responsive"
        point={{ x: 250, y: 400 }}
        site={site}
        viewBox={{ width: 1000, height: 800 }}
      />,
    );

    const marker = container.querySelector('.city-star');
    expect(marker).toHaveStyle({ left: '25%', top: '50%' });
    expect(marker).toHaveAttribute('data-anchor-x', '250');
    expect(marker).toHaveAttribute('data-anchor-y', '400');
  });
});
