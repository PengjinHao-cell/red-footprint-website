/// <reference types="node" />

import { readFileSync } from 'node:fs';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { createValidEightSites } from '../../test/fixtures/sites';
import SiteDetailPanel from './SiteDetailPanel';

const site = siteSchema.parse(createValidEightSites()[0]);
const secondSite = siteSchema.parse(createValidEightSites()[1]);
const detailStyles = readFileSync(
  'src/components/detail/detail.css',
  'utf8',
);

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => undefined,
  );
  vi.stubGlobal('Image', class {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function expectBefore(first: Element, second: Element) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

function renderPanel(
  overrides: Partial<{
    site: Site;
    onClose: () => void;
    returnFocusTo: HTMLElement | null;
  }> = {},
) {
  const onClose = overrides.onClose ?? vi.fn();
  const result = render(
    <SiteDetailPanel
      site={overrides.site ?? site}
      onClose={onClose}
      returnFocusTo={overrides.returnFocusTo}
    />,
  );

  return { ...result, onClose };
}

describe('SiteDetailPanel', () => {
  it('is a named modal dialog with an explicit close button', () => {
    renderPanel();

    const dialog = screen.getByRole('dialog', { name: site.officialName });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      within(dialog).getByRole('button', { name: '关闭景点详情' }),
    ).toBeVisible();
  });

  it('keeps the close action in a sticky layer while content scrolls', () => {
    renderPanel();

    const closeButton = screen.getByRole('button', {
      name: '关闭景点详情',
    });
    expect(closeButton.parentElement).toHaveClass(
      'site-detail__sticky-actions',
    );
    expect(detailStyles).toMatch(
      /\.site-detail__sticky-actions\s*{[^}]*position:\s*sticky[^}]*top:\s*0/s,
    );
  });

  it('uses the real hero photo, configured focus, and title overlay', () => {
    renderPanel();

    const heroImage = screen.getByTestId('site-hero-image');
    const title = screen.getByRole('heading', {
      level: 1,
      name: site.officialName,
    });

    expect(heroImage).toHaveAttribute('src', site.heroImage);
    expect(heroImage).toHaveStyle({
      objectPosition: `${site.heroFocus.x}% ${site.heroFocus.y}%`,
    });
    expect(title.closest('.site-hero__overlay')).not.toBeNull();
  });

  it('renders media before the fixed sequence of content sections', () => {
    renderPanel();

    const dialog = screen.getByRole('dialog', { name: site.officialName });
    const hero = within(dialog).getByTestId('site-hero');
    const media = within(dialog).getByRole('region', { name: '景点媒体' });
    const basic = within(dialog)
      .getByRole('heading', { name: '基础信息' })
      .closest('section');
    const history = within(dialog)
      .getByRole('heading', { name: '历史印记' })
      .closest('section');
    const people = within(dialog)
      .getByRole('heading', { name: '人物故事' })
      .closest('section');
    const spirit = within(dialog)
      .getByRole('heading', { name: '精神传承' })
      .closest('section');
    const reflection = within(dialog)
      .getByRole('heading', { name: '寻访感悟' })
      .closest('section');
    const sources = within(dialog)
      .getByRole('heading', { name: '资料来源' })
      .closest('section');

    expect(basic).not.toBeNull();
    expect(history).not.toBeNull();
    expect(people).not.toBeNull();
    expect(spirit).not.toBeNull();
    expect(reflection).not.toBeNull();
    expect(sources).not.toBeNull();

    expectBefore(hero, media);
    expectBefore(media, basic!);
    expectBefore(basic!, history!);
    expectBefore(history!, people!);
    expectBefore(people!, spirit!);
    expectBefore(spirit!, reflection!);
    expectBefore(reflection!, sources!);
  });

  it('resets the media sequence when the site changes without unmounting the panel', () => {
    const { onClose, rerender } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));
    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));
    expect(screen.getByText('照片 · 3 / 4')).toBeVisible();

    rerender(<SiteDetailPanel site={secondSite} onClose={onClose} />);

    expect(screen.getByText('视频 · 1 / 4')).toBeVisible();
  });

  it('clears a video failure when the site changes without unmounting the panel', () => {
    const { onClose, rerender } = renderPanel();

    fireEvent.error(screen.getByLabelText('景点讲解视频'));
    expect(screen.getByRole('alert')).toHaveTextContent('视频加载失败');

    rerender(<SiteDetailPanel site={secondSite} onClose={onClose} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render headings for empty narrative modules', () => {
    const siteWithEmptyModules = {
      ...site,
      history: '',
      people: '   ',
      spirit: '',
      reflection: '\n',
    } as Site;

    renderPanel({ site: siteWithEmptyModules });

    expect(
      screen.queryByRole('heading', { name: '历史印记' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '人物故事' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '精神传承' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '寻访感悟' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '资料来源' })).toBeVisible();
  });

  it('closes with Escape or the explicit close button', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    const dialog = screen.getByRole('dialog', { name: site.officialName });

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(
      within(dialog).getByRole('button', { name: '关闭景点详情' }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('moves focus inside and traps forward and backward Tab navigation', () => {
    renderPanel();
    const dialog = screen.getByRole('dialog', { name: site.officialName });
    const closeButton = within(dialog).getByRole('button', {
      name: '关闭景点详情',
    });
    const sourceLink = within(dialog).getByRole('link', {
      name: site.sources[0].label,
    });

    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(sourceLink).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('restores focus to returnFocusTo when close is requested', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开景点';
    document.body.append(trigger);
    trigger.focus();
    renderPanel({ returnFocusTo: trigger });

    fireEvent.click(screen.getByRole('button', { name: '关闭景点详情' }));

    expect(trigger).toHaveFocus();
  });

  it('restores focus to returnFocusTo when the dialog unmounts', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开景点';
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = renderPanel({ returnFocusTo: trigger });

    unmount();

    expect(trigger).toHaveFocus();
  });

  it('ships responsive media geometry, touch targets, and reduced motion rules', () => {
    expect(detailStyles).toMatch(
      /\.media-carousel__viewport\s*{[^}]*aspect-ratio:\s*4\s*\/\s*5/s,
    );
    expect(detailStyles).toMatch(
      /\.media-carousel__viewport\s*{[^}]*touch-action:\s*pan-y pinch-zoom/s,
    );
    expect(detailStyles).toMatch(
      /\.media-carousel__image,[^{]*\.media-carousel__video\s*{[^}]*object-fit:\s*contain/s,
    );
    expect(detailStyles).toMatch(
      /\.media-carousel__control\s*{[^}]*min-width:\s*var\(--touch-target\)[^}]*min-height:\s*var\(--touch-target\)/s,
    );
    expect(detailStyles).toContain('@media (min-width: 48rem)');
    expect(detailStyles).toContain('@media (min-width: 64rem)');
    expect(detailStyles).toMatch(/max-width:\s*72ch/);
    expect(detailStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.media-carousel__track\s*{[^}]*transition:\s*none/s,
    );
  });
});
