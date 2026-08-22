import { z } from 'zod';

const placeholderHostPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid)/i;
const versionedObjectPathPattern =
  /^media\/sites\/([a-z0-9-]+)\/(v\d+)\/(hero|photos|video|poster|captions)\/[a-z0-9-]+\.[a-z0-9]+$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'URL must use HTTPS',
  })
  .refine((value) => !placeholderHostPattern.test(new URL(value).hostname), {
    message: 'placeholder or test domains are forbidden',
  });

const legacyHttpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'Video URL must use HTTPS',
  });

const factFieldSchema = z.enum([
  'officialName',
  'address',
  'opening',
  'reservation',
  'visitNotice',
  'history',
  'people',
  'exhibits',
  'spirit',
]);

const factSourceMapSchema = z.object({
  officialName: z.array(z.string().min(1)).min(1),
  address: z.array(z.string().min(1)).min(1),
  opening: z.array(z.string().min(1)).min(1),
  reservation: z.array(z.string().min(1)).min(1),
  visitNotice: z.array(z.string().min(1)).min(1),
  history: z.array(z.string().min(1)).min(1),
  people: z.array(z.string().min(1)).min(1),
  exhibits: z.array(z.string().min(1)).min(1),
  spirit: z.array(z.string().min(1)).min(1),
});

const authoritativeSourceSchema = z.object({
  id: z.string().min(1),
  sourceType: z.literal('authoritative-web'),
  label: z.string().min(2),
  title: z.string().min(2),
  publisher: z.string().min(2),
  url: httpsUrlSchema,
  accessedAt: z.iso.date(),
  authorityType: z.enum([
    'venue-official',
    'government',
    'culture-tourism',
    'authoritative-memorial',
    'government-origin-republication',
  ]),
  supports: z.array(factFieldSchema).min(1),
  temporal: z
    .object({
      checkedAt: z.iso.date(),
      validThrough: z.iso.date(),
    })
    .optional(),
});

const localMaterialSourceSchema = z.object({
  sourceType: z.literal('local-document'),
  documentPath: z.string().min(1),
  supports: z.array(factFieldSchema).min(1),
  note: z.string().min(2),
});

const factReviewSchema = z.object({
  status: z.literal('verified'),
  sourceIds: z.array(z.string().min(1)).min(1),
});

const contentReviewSchema = z.object({
  status: z.literal('verified'),
  reviewedAt: z.iso.date(),
  reviewedBy: z.string().min(2),
  factReviews: z.object({
    officialName: factReviewSchema,
    address: factReviewSchema,
    opening: factReviewSchema,
    reservation: factReviewSchema,
    visitNotice: factReviewSchema,
    history: factReviewSchema,
    people: factReviewSchema,
    exhibits: factReviewSchema,
    spirit: factReviewSchema,
  }),
  temporalReview: z.object({
    checkedAt: z.iso.date(),
    validThrough: z.iso.date(),
  }),
  separationReview: z.object({
    factAndReflectionSeparated: z.literal(true),
    reflectionIntroducesNewFacts: z.literal(false),
  }),
  unresolvedFacts: z.array(z.record(z.string(), z.unknown())),
  localMaterialSources: z.array(localMaterialSourceSchema),
});

const resourceBaseSchema = z.object({
  objectPath: z.string().regex(versionedObjectPathPattern),
  version: z.string().regex(/^v\d+$/),
  mime: z.string().min(3),
  bytes: z.number().int().positive(),
  sha256: z.string().regex(sha256Pattern),
  digestRef: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  manifestPath: z.literal('content/media/media-manifest.json'),
});

const preUploadResourceSchema = resourceBaseSchema
  .extend({
    deliveryStatus: z.literal('pre-upload-object'),
    url: z.string().regex(/^\/media\/sites\/[a-z0-9-]+\/v\d+\//),
    productionUrl: z.null(),
  })
  .superRefine((resource, context) => {
    if (resource.url !== `/${resource.objectPath}`) {
      context.addIssue({
        code: 'custom',
        message: 'pre-upload URL must equal the versioned object path',
        path: ['url'],
      });
    }
    const match = versionedObjectPathPattern.exec(resource.objectPath);
    if (match?.[2] !== resource.version) {
      context.addIssue({
        code: 'custom',
        message: 'resource version must match objectPath',
        path: ['version'],
      });
    }
  });

const reconciledResourceSchema = resourceBaseSchema
  .extend({
    deliveryStatus: z.literal('reconciled-production'),
    url: httpsUrlSchema,
    productionUrl: httpsUrlSchema,
  })
  .superRefine((resource, context) => {
    if (resource.url !== resource.productionUrl) {
      context.addIssue({
        code: 'custom',
        message: 'reconciled URL must equal productionUrl',
        path: ['url'],
      });
    }
  });

const mediaResourceSchema = z.union([
  preUploadResourceSchema,
  reconciledResourceSchema,
]);

const stableSites = {
  'sihong-memorial': {
    officialName: '淮北抗日民主根据地纪念馆',
    coordinates: { lat: 33.447482, lng: 118.210953 },
  },
  'yuhuatai-martyrs': {
    officialName: '雨花台烈士陵园',
    coordinates: { lat: 31.998425, lng: 118.780177 },
  },
  'dujiang-victory': {
    officialName: '渡江胜利纪念馆',
    coordinates: { lat: 32.073563, lng: 118.73173 },
  },
  'sihang-warehouse': {
    officialName: '上海四行仓库抗战纪念馆',
    coordinates: { lat: 31.24034, lng: 121.471104 },
  },
  'cpc-first-congress': {
    officialName: '中国共产党第一次全国代表大会纪念馆',
    coordinates: { lat: 31.220104, lng: 121.475407 },
  },
  'jiangshangqing-memorial': {
    officialName: '江上青烈士史料陈列馆',
    coordinates: { lat: 32.390314, lng: 119.434459 },
  },
  'yangzhou-martyrs': {
    officialName: '扬州革命烈士陵园',
    coordinates: { lat: 32.421642, lng: 119.415186 },
  },
  'meiyuan-new-village': {
    officialName: '中国共产党代表团梅园新村纪念馆',
    coordinates: { lat: 32.042379, lng: 118.801602 },
  },
} as const;

const stableSiteIdSchema = z.enum([
  'sihong-memorial',
  'yuhuatai-martyrs',
  'dujiang-victory',
  'sihang-warehouse',
  'cpc-first-congress',
  'jiangshangqing-memorial',
  'yangzhou-martyrs',
  'meiyuan-new-village',
]);

const basicSiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  officialName: z.string().min(2),
  shortName: z.string().min(2),
  province: z.enum(['江苏省', '上海市']),
  city: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(5),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
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
    url: legacyHttpsUrlSchema,
    poster: z.string().min(1),
    captions: z.string().min(1),
  }),
  sources: z
    .array(
      z.object({
        label: z.string().min(2),
        url: legacyHttpsUrlSchema,
      }),
    )
    .min(1),
});

const productionPhotoSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(4),
  sequence: z.number().int().min(1).max(5),
  asset: mediaResourceSchema,
});

const videoMediaItemSchema = z.object({
  type: z.literal('video'),
  src: z.string().min(1),
  poster: z.string().min(1),
  captions: z.string().min(1),
});

const photoMediaItemSchema = z.object({
  type: z.literal('image'),
  src: z.string().min(1),
  alt: z.string().min(4),
});

export const productionSiteSchema = basicSiteSchema
  .omit({ photos: true, video: true, sources: true })
  .extend({
    id: stableSiteIdSchema,
    markerAddress: z.string().min(5),
    coordinateSystem: z.literal('GCJ-02'),
    coordinates: z.object({
      lat: z.number().min(18).max(54),
      lng: z.number().min(73).max(135),
    }),
    basicInformation: z.object({
      opening: z.string().min(2),
      reservation: z.string().min(2),
      visitNotice: z.string().min(2),
    }),
    historicalImprint: z.string().min(80),
    peopleStories: z.string().min(50),
    exhibitsAndSiteMeaning: z.string().min(50),
    spiritualLegacy: z.string().min(50),
    teamReflection: z.object({
      type: z.literal('team-reflection'),
      text: z.string().min(50),
    }),
    factSourceMap: factSourceMapSchema,
    sources: z.array(authoritativeSourceSchema).min(1),
    contentReview: contentReviewSchema,
    mediaDelivery: z.union([
      z.object({
        status: z.literal('pre-upload-object'),
        version: z.string().regex(/^v\d+$/),
        productionBaseUrl: z.null(),
      }),
      z.object({
        status: z.literal('reconciled-production'),
        version: z.string().regex(/^v\d+$/),
        productionBaseUrl: httpsUrlSchema,
      }),
    ]),
    heroAsset: mediaResourceSchema,
    photos: z.array(productionPhotoSchema).min(1).max(5),
    video: z.object({
      url: z.string().min(1),
      poster: z.string().min(1),
      captions: z.string().min(1),
      asset: mediaResourceSchema,
      posterAsset: mediaResourceSchema,
      captionsAsset: mediaResourceSchema,
      posterReview: z.object({
        aiWatermarkPresent: z.boolean(),
        aiWatermarkAccepted: z.boolean(),
        disclosurePath: z.literal(
          'content/media/media-rights-declaration.json',
        ),
        acceptedBy: z.string().min(2).nullable(),
        acceptedAt: z.iso.date().nullable(),
      }),
      captionsReview: z.object({
        reviewedAgainst: z.literal('real-audio-and-video'),
        reviewedBy: z.string().min(2),
        reviewedAt: z.iso.date(),
      }),
    }),
    media: z.array(z.union([videoMediaItemSchema, photoMediaItemSchema])).min(2),
    mediaRights: z.object({
      declarationPath: z.literal(
        'content/media/media-rights-declaration.json',
      ),
      declarationDate: z.iso.date(),
      declaredBy: z.string().min(2),
      statement: z.string().min(10),
      identifiablePeopleApproved: z.literal(true),
    }),
  })
  .superRefine((site, context) => {
    const stable = stableSites[site.id];
    if (site.officialName !== stable.officialName) {
      context.addIssue({
        code: 'custom',
        message: 'officialName must match the stable site ID',
        path: ['officialName'],
      });
    }
    if (
      site.coordinates.lat !== stable.coordinates.lat ||
      site.coordinates.lng !== stable.coordinates.lng
    ) {
      context.addIssue({
        code: 'custom',
        message: 'GCJ-02 coordinates must match the confirmed site point',
        path: ['coordinates'],
      });
    }
    if (
      site.id === 'cpc-first-congress' &&
      (site.markerAddress !== '上海市黄浦区兴业路76号' ||
        site.address !== '上海市黄浦区黄陂南路374号')
    ) {
      context.addIssue({
        code: 'custom',
        message: '中共一大纪念馆必须保留兴业路76号点位和黄陂南路374号参观地址',
        path: ['markerAddress'],
      });
    }
    if (
      site.opening !== site.basicInformation.opening ||
      site.reservation !== site.basicInformation.reservation ||
      site.visitNotice !== site.basicInformation.visitNotice
    ) {
      context.addIssue({
        code: 'custom',
        message: 'legacy basic fields must match basicInformation',
        path: ['basicInformation'],
      });
    }
    if (
      site.history !== site.historicalImprint ||
      site.people !== site.peopleStories ||
      site.spirit !== site.spiritualLegacy ||
      site.reflection !== site.teamReflection.text
    ) {
      context.addIssue({
        code: 'custom',
        message: 'legacy narrative fields must match reviewed narrative modules',
        path: ['historicalImprint'],
      });
    }
    if (site.heroImage !== site.heroAsset.url) {
      context.addIssue({
        code: 'custom',
        message: 'heroImage must resolve from heroAsset',
        path: ['heroImage'],
      });
    }
    site.photos.forEach((photo, index) => {
      if (
        photo.sequence !== index + 1 ||
        photo.src !== photo.asset.url ||
        site.media[index + 1]?.type !== 'image' ||
        site.media[index + 1]?.src !== photo.src
      ) {
        context.addIssue({
          code: 'custom',
          message: 'photo order and media sequence must remain fixed',
          path: ['photos', index],
        });
      }
    });
    if (
      site.media.length !== site.photos.length + 1 ||
      site.media[0]?.type !== 'video' ||
      site.media[0]?.src !== site.video.url
    ) {
      context.addIssue({
        code: 'custom',
        message: 'media first item must be the single video',
        path: ['media'],
      });
    }
    if (
      site.video.url !== site.video.asset.url ||
      site.video.poster !== site.video.posterAsset.url ||
      site.video.captions !== site.video.captionsAsset.url
    ) {
      context.addIssue({
        code: 'custom',
        message: 'video URLs must resolve from their traceable resources',
        path: ['video'],
      });
    }
    const expectedDelivery =
      site.mediaDelivery.status === 'pre-upload-object'
        ? 'pre-upload-object'
        : 'reconciled-production';
    const resources = [
      site.heroAsset,
      ...site.photos.map((photo) => photo.asset),
      site.video.asset,
      site.video.posterAsset,
      site.video.captionsAsset,
    ];
    if (
      resources.some(
        (resource) => resource.deliveryStatus !== expectedDelivery,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'all media resources must match mediaDelivery status',
        path: ['mediaDelivery'],
      });
    }
  });

export const productionSiteCollectionSchema = z
  .array(productionSiteSchema)
  .length(8, 'Production collection must contain exactly 8 sites')
  .superRefine((sites, context) => {
    const ids = new Set(sites.map(({ id }) => id));
    const names = new Set(sites.map(({ officialName }) => officialName));
    if (ids.size !== 8) {
      context.addIssue({ code: 'custom', message: 'Production IDs must be unique' });
    }
    if (names.size !== 8) {
      context.addIssue({
        code: 'custom',
        message: 'Production official names must be unique',
      });
    }
    Object.keys(stableSites).forEach((id) => {
      if (!ids.has(id as keyof typeof stableSites)) {
        context.addIssue({
          code: 'custom',
          message: `Production collection is missing ${id}`,
        });
      }
    });
  });

export const siteSchema = z.union([productionSiteSchema, basicSiteSchema]);

export type Site = z.infer<typeof siteSchema>;
