import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema } from '../../data/siteSchema';
import SiteDirectory from './SiteDirectory';

const sites = siteSchema
  .array()
  .parse(
    JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/sites.json'), 'utf8'),
    ),
  );

afterEach(cleanup);

describe('SiteDirectory', () => {
  it('renders eight image cards ordered by city pinyin', () => {
    render(<SiteDirectory onOpen={vi.fn()} sites={sites} visitedIds={[]} />);

    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.getAllByRole('img')).toHaveLength(8);
    expect(
      screen.getByText('中国共产党第一次全国代表大会纪念馆'),
    ).toBeVisible();
    expect(
      screen.getByText('中国共产党代表团梅园新村纪念馆'),
    ).toBeVisible();
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('loading', 'lazy');
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('decoding', 'async');
    expect(screen.getAllByRole('img')[0]).toHaveAttribute(
      'alt',
      '渡江胜利纪念馆代表图片',
    );
  });

  it('opens the exact site detail from a card click without a flight', () => {
    const onOpen = vi.fn();
    render(<SiteDirectory onOpen={onOpen} sites={sites} visitedIds={[]} />);

    fireEvent.click(
      screen.getByRole('button', { name: /查看渡江胜利纪念馆/ }),
    );

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('dujiang-victory');
  });

  it('marks visited cards without truncating the official name', () => {
    const { container } = render(
      <SiteDirectory
        onOpen={vi.fn()}
        sites={sites}
        visitedIds={['cpc-first-congress']}
      />,
    );

    const firstCongressCard = screen
      .getByRole('button', { name: /查看中国共产党第一次全国代表大会纪念馆/ })
      .closest('.site-directory__card');
    expect(firstCongressCard).not.toBeNull();
    expect(firstCongressCard).toHaveTextContent('已点亮');

    const title =
      firstCongressCard?.querySelector('.site-directory__card-title');
    expect(title).toHaveTextContent('中国共产党第一次全国代表大会纪念馆');
    expect(
      container.querySelectorAll('.site-directory__card-title'),
    ).toHaveLength(8);
  });
});
