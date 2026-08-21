import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaItem } from '../../lib/media';
import MediaCarousel from './MediaCarousel';

const items: MediaItem[] = [
  {
    type: 'video',
    src: 'https://media.invalid/site.mp4',
    poster: '/poster.webp',
    captions: '/captions.vtt',
  },
  {
    type: 'image',
    src: '/photo-01.webp',
    alt: '纪念馆入口的审核照片',
  },
  {
    type: 'image',
    src: '/photo-02.webp',
    alt: '纪念馆展陈的审核照片',
  },
];

let prefetchedSources: string[];

beforeEach(() => {
  prefetchedSources = [];
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => undefined,
  );
  vi.stubGlobal(
    'Image',
    class {
      set src(value: string) {
        prefetchedSources.push(value);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function dispatchPointer(
  element: HTMLElement,
  type: 'pointerdown' | 'pointerup',
  coordinates: { clientX: number; clientY: number; pointerType?: string },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: coordinates.clientX },
    clientY: { value: coordinates.clientY },
    pointerType: { value: coordinates.pointerType ?? 'touch' },
  });
  fireEvent(element, event);
  return event;
}

function renderCarousel() {
  render(<MediaCarousel items={items} />);
  return screen.getByRole('region', { name: '景点媒体' });
}

describe('MediaCarousel', () => {
  it('announces the page and type, hides its hint after navigation, and never loops', () => {
    const region = renderCarousel();
    const previous = screen.getByRole('button', { name: '上一项媒体' });
    const next = screen.getByRole('button', { name: '下一项媒体' });

    expect(screen.getByText('视频 · 1 / 3')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByText('左滑查看寻访照片')).toBeVisible();
    expect(previous).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();
    expect(screen.queryByText('左滑查看寻访照片')).not.toBeInTheDocument();

    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByText('照片 · 3 / 3')).toBeVisible();
    expect(next).toBeDisabled();

    fireEvent.click(next);
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByText('照片 · 3 / 3')).toBeVisible();

    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();
  });

  it('supports touch swipes and mouse drags through Pointer Events', () => {
    const region = renderCarousel();

    dispatchPointer(region, 'pointerdown', { clientX: 220, clientY: 100 });
    dispatchPointer(region, 'pointerup', { clientX: 160, clientY: 104 });
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();

    dispatchPointer(region, 'pointerdown', {
      clientX: 220,
      clientY: 100,
      pointerType: 'mouse',
    });
    dispatchPointer(region, 'pointerup', {
      clientX: 160,
      clientY: 100,
      pointerType: 'mouse',
    });
    expect(screen.getByText('照片 · 3 / 3')).toBeVisible();
  });

  it('requires 48px horizontal intent and yields gestures starting within 24px of an edge', () => {
    const region = renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));

    dispatchPointer(region, 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(region, 'pointerup', { clientX: 153, clientY: 100 });
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();

    dispatchPointer(region, 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(region, 'pointerup', { clientX: 140, clientY: 150 });
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();

    dispatchPointer(region, 'pointerdown', { clientX: 20, clientY: 100 });
    const edgePointerUp = dispatchPointer(region, 'pointerup', {
      clientX: 100,
      clientY: 100,
    });
    expect(edgePointerUp.defaultPrevented).toBe(false);
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();

    dispatchPointer(region, 'pointerdown', { clientX: 160, clientY: 100 });
    const acceptedPointerUp = dispatchPointer(region, 'pointerup', {
      clientX: 208,
      clientY: 100,
    });
    expect(acceptedPointerUp.defaultPrevented).toBe(true);
    expect(screen.getByText('视频 · 1 / 3')).toBeVisible();
  });

  it('locks buttons, keys, and gestures while video plays and unlocks on every stop state', () => {
    const region = renderCarousel();
    let video = screen.getByLabelText('景点讲解视频');
    const next = screen.getByRole('button', { name: '下一项媒体' });

    fireEvent.play(video);
    expect(next).toBeDisabled();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    dispatchPointer(region, 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(region, 'pointerup', { clientX: 140, clientY: 100 });
    expect(screen.getByText('视频 · 1 / 3')).toBeVisible();

    fireEvent.pause(video);
    expect(next).toBeEnabled();
    fireEvent.click(next);
    fireEvent.click(screen.getByRole('button', { name: '上一项媒体' }));

    video = screen.getByLabelText('景点讲解视频');
    fireEvent.play(video);
    fireEvent.ended(video);
    expect(next).toBeEnabled();

    fireEvent.play(video);
    fireEvent.error(video);
    expect(next).toBeEnabled();
  });

  it('unmounts and pauses the player when leaving the video', () => {
    renderCarousel();

    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));

    expect(screen.queryByLabelText('景点讲解视频')).not.toBeInTheDocument();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
  });

  it('renders only the current medium and prefetches only adjacent images', () => {
    renderCarousel();

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(prefetchedSources).toEqual(['/photo-01.webp']);

    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));

    const image = screen.getByRole('img', {
      name: '纪念馆入口的审核照片',
    });
    expect(image).toHaveAttribute('src', '/photo-01.webp');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(
      screen.queryByRole('img', { name: '纪念馆展陈的审核照片' }),
    ).not.toBeInTheDocument();
    expect(prefetchedSources).toEqual([
      '/photo-01.webp',
      '/photo-02.webp',
    ]);
  });

  it('shows an understandable placeholder when the current image fails', () => {
    renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));

    fireEvent.error(
      screen.getByRole('img', { name: '纪念馆入口的审核照片' }),
    );

    expect(
      screen.getByRole('img', {
        name: '照片加载失败：纪念馆入口的审核照片',
      }),
    ).toHaveTextContent('照片加载失败');
    expect(screen.getByText('照片 · 2 / 3')).toBeVisible();
  });
});
