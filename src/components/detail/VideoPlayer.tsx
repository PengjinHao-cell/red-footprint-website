import { useEffect, useRef, useState } from 'react';

type VideoPlayerProps = {
  src: string;
  poster: string;
  captions: string;
  onPlayingChange: (playing: boolean) => void;
};

export default function VideoPlayer({
  src,
  poster,
  captions,
  onPlayingChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      video?.pause();
      onPlayingChange(false);
    };
  }, [onPlayingChange]);

  const handleError = () => {
    setFailed(true);
    onPlayingChange(false);
  };

  const handleReload = () => {
    setFailed(false);
    videoRef.current?.load();
  };

  return (
    <div className="video-player">
      <video
        aria-label="景点讲解视频"
        className="media-carousel__video"
        controls
        onEnded={() => onPlayingChange(false)}
        onError={handleError}
        onPause={() => onPlayingChange(false)}
        onPlay={() => onPlayingChange(true)}
        playsInline
        poster={poster}
        preload="metadata"
        ref={videoRef}
        src={src}
      >
        <track
          default
          kind="captions"
          label="中文字幕"
          src={captions}
          srcLang="zh-CN"
        />
      </video>
      {failed && (
        <div className="video-player__failure" role="alert">
          <p>视频加载失败，请检查网络后重试。</p>
          <button onClick={handleReload} type="button">
            重新加载
          </button>
        </div>
      )}
    </div>
  );
}
