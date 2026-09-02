import { readFileSync } from 'node:fs';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import type { CityId } from './cityMapConfig';
import CityMap from './CityMap';

const sites = siteSchema.array().parse(
  JSON.parse(readFileSync('src/data/sites.json', 'utf8')),
);

const expectedCounts: Record<CityId, number> = {
  nanjing: 3,
  shanghai: 2,
  yangzhou: 2,
  suqian: 1,
};

afterEach(cleanup);

describe('CityMap', () => {
  for (const [cityId, count] of Object.entries(expectedCounts) as Array<[CityId, number]>) {
    it(`renders ${count} projected site choices for ${cityId}`, () => {
      render(
        <CityMap
          cityId={cityId}
          onBack={vi.fn()}
          onSelectSite={vi.fn()}
          sites={sites}
        />,
      );

      expect(screen.getAllByTestId('city-star')).toHaveLength(count);
      expect(screen.getByText(/审图号/)).toBeVisible();
      expect(screen.getByRole('button', { name: '返回全国地图' })).toBeVisible();
    });
  }

  it('selects a projected site and returns to the national map', () => {
    const onBack = vi.fn();
    const onSelectSite = vi.fn();
    render(
      <CityMap
        cityId="nanjing"
        onBack={onBack}
        onSelectSite={onSelectSite}
        sites={sites}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '雨花台烈士陵园' }));
    fireEvent.click(screen.getByRole('button', { name: '返回全国地图' }));
    expect(onSelectSite).toHaveBeenCalledWith('yuhuatai-martyrs');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['雨花台烈士陵园', 'yuhuatai-martyrs'],
    ['渡江胜利纪念馆', 'dujiang-victory'],
    ['中国共产党代表团梅园新村纪念馆', 'meiyuan-new-village'],
  ])('selects %s without another marker intercepting it', (name, id) => {
    const onSelectSite = vi.fn();
    render(<CityMap cityId="nanjing" onBack={vi.fn()} onSelectSite={onSelectSite} sites={sites} />);
    fireEvent.click(screen.getByRole('button', { name }));
    expect(onSelectSite).toHaveBeenLastCalledWith(id);
  });

  it('routes an overlapped star click to the nearest Nanjing anchor', () => {
    const onSelectSite = vi.fn();
    const { container } = render(
      <CityMap cityId="nanjing" onBack={vi.fn()} onSelectSite={onSelectSite} sites={sites} />,
    );

    const markers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-testid="city-star"]'),
    );
    expect(markers).toHaveLength(3);

    // DOM order follows sites.json: yuhuatai, dujiang, meiyuan.
    const centers = [
      { x: 100, y: 100 },
      { x: 120, y: 100 },
      { x: 140, y: 100 },
    ];
    markers.forEach((marker, index) => {
      const { x, y } = centers[index];
      vi.spyOn(marker, 'getBoundingClientRect').mockReturnValue({
        left: x - 32,
        top: y - 32,
        right: x + 32,
        bottom: y + 32,
        width: 64,
        height: 64,
        x: x - 32,
        y: y - 32,
        toJSON: () => ({}),
      } as DOMRect);
    });

    // The topmost (Meiyuan) hit button receives the click, but the click
    // lands closest to Yuhuatai's anchor, so Yuhuatai must be selected.
    const meiyuanHit = screen.getByRole('button', {
      name: '定位并查看中国共产党代表团梅园新村纪念馆',
    });
    fireEvent.click(meiyuanHit, { clientX: 102, clientY: 100 });
    expect(onSelectSite).toHaveBeenCalledWith('yuhuatai-martyrs');
  });

  it('falls back to accessible site buttons when the map image fails', () => {
    const onSelectSite = vi.fn();
    render(
      <CityMap
        cityId="shanghai"
        onBack={vi.fn()}
        onSelectSite={onSelectSite}
        sites={sites}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: '上海市标准地图底图' }));

    expect(screen.getByText('城市底图暂时无法显示')).toBeVisible();
    expect(screen.getByText(/审图号/)).toBeVisible();
    const fallbackButton = screen.getByRole('button', {
      name: '查看上海四行仓库抗战纪念馆',
    });
    fireEvent.click(fallbackButton);
    expect(onSelectSite).toHaveBeenCalledWith('sihang-warehouse');
  });

  it('does not mutate the supplied site records', () => {
    const copy = structuredClone(sites) as Site[];
    render(
      <CityMap
        cityId="suqian"
        onBack={vi.fn()}
        onSelectSite={vi.fn()}
        sites={sites}
      />,
    );
    expect(sites).toEqual(copy);
  });
});
