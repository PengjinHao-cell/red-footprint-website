import { useEffect, useRef, useState } from 'react';

import type { MediaItem } from '../../lib/media';
import VideoPlayer from './VideoPlayer';

type MediaCarouselProps = {
  items: MediaItem[];
};

type PointerStart = {
  x: number;
  y: number;
  nearScreenEdge: boolean;
};

const MIN_SWIPE_DISTANCE = 48;
const HORIZONTAL_INTENT_RATIO = 1.25;
const SYSTEM_GESTURE_EDGE = 24;

export default function MediaCarousel({ items }: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const pointerStart = useRef<PointerStart | null>(null);
  const currentItem = items[activeIndex];
  const canGoPrevious = !videoPlaying && activeIndex > 0;
  const canGoNext = !videoPlaying && activeIndex < items.length - 1;

  useEffect(() => {
    [items[activeIndex - 1], items[activeIndex + 1]].forEach((item) => {
      if (item?.type === 'image') {
        const image = new Image();
        image.src = item.src;
      }
    });
  }, [activeIndex, items]);

  const navigateTo = (nextIndex: number) => {
    if (videoPlaying) {
      return;
    }

    const boundedIndex = Math.min(Math.max(nextIndex, 0), items.length - 1);
    if (boundedIndex === activeIndex) {
      return;
    }

    setActiveIndex(boundedIndex);
    setHasNavigated(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || videoPlaying) {
      return;
    }

    if (event.key === 'ArrowLeft' && canGoPrevious) {
      event.preventDefault();
      navigateTo(activeIndex - 1);
    }

    if (event.key === 'ArrowRight' && canGoNext) {
      event.preventDefault();
      navigateTo(activeIndex + 1);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (videoPlaying) {
      pointerStart.current = null;
      return;
    }

    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      nearScreenEdge:
        event.clientX <= SYSTEM_GESTURE_EDGE ||
        window.innerWidth - event.clientX <= SYSTEM_GESTURE_EDGE,
    };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;

    if (!start || start.nearScreenEdge || videoPlaying) {
      return;
    }

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    const isHorizontalGesture =
      Math.abs(horizontalDistance) >= MIN_SWIPE_DISTANCE &&
      Math.abs(horizontalDistance) >
        Math.abs(verticalDistance) * HORIZONTAL_INTENT_RATIO;

    if (!isHorizontalGesture) {
      return;
    }

    event.preventDefault();
    navigateTo(activeIndex + (horizontalDistance < 0 ? 1 : -1));
  };

  const mediaType = currentItem.type === 'video' ? '视频' : '照片';

  return (
    <section
      aria-label="景点媒体"
      className="media-carousel"
      onKeyDown={handleKeyDown}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      role="region"
      tabIndex={0}
    >
      <div className="media-carousel__viewport">
        <div className="media-carousel__track">
          {currentItem.type === 'video' ? (
            <VideoPlayer
              captions={currentItem.captions}
              onPlayingChange={setVideoPlaying}
              poster={currentItem.poster}
              src={currentItem.src}
            />
          ) : failedImageSrc === currentItem.src ? (
            <div
              aria-label={`照片加载失败：${currentItem.alt}`}
              className="media-carousel__image-failure"
              role="img"
            >
              <span>照片加载失败</span>
              <small>{currentItem.alt}</small>
            </div>
          ) : (
            <img
              alt={currentItem.alt}
              className="media-carousel__image"
              decoding="async"
              loading="lazy"
              onError={() => setFailedImageSrc(currentItem.src)}
              src={currentItem.src}
            />
          )}
        </div>

        <button
          aria-label="上一项媒体"
          className="media-carousel__control media-carousel__control--previous"
          disabled={!canGoPrevious}
          onClick={() => navigateTo(activeIndex - 1)}
          type="button"
        >
          ‹
        </button>
        <button
          aria-label="下一项媒体"
          className="media-carousel__control media-carousel__control--next"
          disabled={!canGoNext}
          onClick={() => navigateTo(activeIndex + 1)}
          type="button"
        >
          ›
        </button>
      </div>

      <div className="media-carousel__meta">
        <p aria-atomic="true" aria-live="polite">
          {mediaType} · {activeIndex + 1} / {items.length}
        </p>
        {!hasNavigated && items.length > 1 && (
          <p className="media-carousel__hint">左滑查看寻访照片</p>
        )}
      </div>
    </section>
  );
}
