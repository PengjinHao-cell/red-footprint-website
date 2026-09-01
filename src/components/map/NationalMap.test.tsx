import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NationalMap from './NationalMap';

afterEach(cleanup);

describe('NationalMap', () => {
  it('renders four city choices and no site stars', () => {
    render(<NationalMap disabled={false} onSelectCity={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /^进入/ })).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /红星|红色坐标/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '中华人民共和国平面地图' })).toBeVisible();
  });

  it('selects the exact city once from its accessible button', () => {
    const onSelectCity = vi.fn();
    render(<NationalMap disabled={false} onSelectCity={onSelectCity} />);

    fireEvent.click(screen.getByRole('button', { name: '进入南京市' }));

    expect(onSelectCity).toHaveBeenCalledTimes(1);
    expect(onSelectCity).toHaveBeenCalledWith('nanjing');
  });

  it('disables all four choices during a transition', () => {
    const onSelectCity = vi.fn();
    render(<NationalMap disabled onSelectCity={onSelectCity} />);

    const buttons = screen.getAllByRole('button', { name: /^进入/ });
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onSelectCity).not.toHaveBeenCalled();
  });

  it('keeps the four city anchors fixed while the inner glow animates', () => {
    const { container } = render(
      <NationalMap disabled={false} onSelectCity={vi.fn()} />,
    );

    expect(container.querySelectorAll('.national-map__city-anchor')).toHaveLength(4);
    expect(container.querySelectorAll('.national-map__city-glow')).toHaveLength(4);
    for (const anchor of container.querySelectorAll('.national-map__city-anchor')) {
      expect(anchor.getAttribute('transform')).toMatch(/^translate\(/);
      expect(anchor.querySelector('.national-map__city-glow')?.getAttribute('transform')).toBeNull();
    }
  });
});
