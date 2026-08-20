import { z } from 'zod';

export const siteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  officialName: z.string().min(2),
  shortName: z.string().min(2),
  province: z.enum(['江苏省', '上海市']),
  city: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(5),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  opening: z.string().min(2),
  reservation: z.string().min(2),
  visitNotice: z.string().min(2),
  officialTitle: z.string().min(2),
  history: z.string().min(80),
  people: z.string().min(50),
  spirit: z.string().min(50),
  reflection: z.string().min(50),
  heroImage: z.string().min(1),
  heroFocus: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  photos: z
    .array(
      z.object({
        src: z.string().min(1),
        alt: z.string().min(4),
      }),
    )
    .min(1)
    .max(5),
  video: z.object({
    url: z
      .string()
      .url()
      .refine((url) => url.startsWith('https://'), {
        message: 'Video URL must use HTTPS',
      }),
    poster: z.string().min(1),
    captions: z.string().min(1),
  }),
  sources: z
    .array(
      z.object({
        label: z.string().min(2),
        url: z.string().url(),
      }),
    )
    .min(1),
});

export type Site = z.infer<typeof siteSchema>;
