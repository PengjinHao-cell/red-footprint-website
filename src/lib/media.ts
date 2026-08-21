import type { Site } from '../data/siteSchema';

export type VideoMediaItem = {
  type: 'video';
  src: string;
  poster: string;
  captions: string;
};

export type ImageMediaItem = {
  type: 'image';
  src: string;
  alt: string;
};

export type MediaItem = VideoMediaItem | ImageMediaItem;

export function buildMediaItems(site: Site): MediaItem[] {
  return [
    {
      type: 'video',
      src: site.video.url,
      poster: site.video.poster,
      captions: site.video.captions,
    },
    ...site.photos.map((photo) => ({
      type: 'image' as const,
      src: photo.src,
      alt: photo.alt,
    })),
  ];
}
