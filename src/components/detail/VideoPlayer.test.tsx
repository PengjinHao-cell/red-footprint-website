import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import VideoPlayer from './VideoPlayer';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => undefined,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPlayer(onPlayingChange = vi.fn()) {
  const result = render(
    <VideoPlayer
      src="https://media.invalid/site.mp4"
      poster="/poster.webp"
      captions="/captions.vtt"
      onPlayingChange={onPlayingChange}
    />,
  );

  return {
    ...result,
    onPlayingChange,
    video: screen.getByLabelText('景点讲解视频'),
  };
}

describe('VideoPlayer', () => {
  it('uses browser playback controls, metadata preload, a poster, and Chinese captions', () => {
    const { video } = renderPlayer();
    const track = video.querySelector('track');

    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('poster', '/poster.webp');
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', '/captions.vtt');
    expect(track).toHaveAttribute('srclang', 'zh-CN');
    expect(track).toHaveAttribute('label', '中文字幕');
    expect(track).toHaveAttribute('default');
  });

  it('reports play, pause, and ended state changes', () => {
    const onPlayingChange = vi.fn();
    const { video } = renderPlayer(onPlayingChange);

    fireEvent.play(video);
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);

    fireEvent.pause(video);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);

    fireEvent.ended(video);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
  });

  it('shows an understandable failure and reloads the video on request', () => {
    const load = vi
      .spyOn(HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => undefined);
    const onPlayingChange = vi.fn();
    const { video } = renderPlayer(onPlayingChange);

    fireEvent.error(video);

    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('alert')).toHaveTextContent('视频加载失败');

    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));

    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pauses and releases the playing lock when unmounted', () => {
    const onPlayingChange = vi.fn();
    const { unmount, video } = renderPlayer(onPlayingChange);

    fireEvent.play(video);
    unmount();

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
  });
});
