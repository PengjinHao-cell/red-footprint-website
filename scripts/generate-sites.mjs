import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  productionSiteCollectionSchema,
} from '../src/data/siteSchema.ts';
import {
  REQUIRED_SITE_IDS,
  validateProductionContent,
} from './check-production-content.mjs';
import { checkMedia } from './check-media.mjs';

const MEDIA_MANIFEST_PATH = 'content/media/media-manifest.json';
const MEDIA_RIGHTS_PATH = 'content/media/media-rights-declaration.json';

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function createResource(asset, version) {
  return {
    deliveryStatus: 'pre-upload-object',
    url: `/${asset.objectPath}`,
    productionUrl: null,
    objectPath: asset.objectPath,
    version,
    mime: asset.mime,
    bytes: asset.bytes,
    sha256: asset.sha256,
    digestRef: `sha256:${asset.sha256}`,
    manifestPath: MEDIA_MANIFEST_PATH,
  };
}

function createSite({ site, sources, review, media, rights, version }) {
  const heroAsset = createResource(media.hero, version);
  const photos = media.photos.map((photo) => ({
    src: `/${photo.objectPath}`,
    alt: photo.alt,
    sequence: photo.sequence,
    asset: createResource(photo, version),
  }));
  const videoAsset = createResource(media.video, version);
  const posterAsset = createResource(media.poster, version);
  const captionsAsset = createResource(media.captions, version);
  const watermarkDisclosure = rights.aiWatermarkPosters.find(
    ({ siteId }) => siteId === site.id,
  );
  const opening = site.basicInformation.opening;
  const reservation = site.basicInformation.reservation;
  const visitNotice = site.basicInformation.visitNotice;

  return {
    id: site.id,
    officialName: site.officialName,
    shortName: site.shortName,
    province: site.province,
    city: site.city,
    district: site.district,
    markerAddress: site.markerAddress ?? site.address,
    address: site.address,
    coordinateSystem: 'GCJ-02',
    coordinates: site.coordinates,
    basicInformation: site.basicInformation,
    opening,
    reservation,
    visitNotice,
    officialTitle: site.officialName,
    historicalImprint: site.historicalImprint,
    peopleStories: site.peopleStories,
    exhibitsAndSiteMeaning: site.exhibitsAndSiteMeaning,
    spiritualLegacy: site.spiritualLegacy,
    teamReflection: site.teamReflection,
    history: site.historicalImprint,
    people: site.peopleStories,
    spirit: site.spiritualLegacy,
    reflection: site.teamReflection.text,
    factSourceMap: site.factSourceMap,
    sources: sources.sources.map((source) => ({
      ...source,
      sourceType: 'authoritative-web',
      label: source.title,
    })),
    contentReview: {
      status: review.status,
      reviewedAt: review.reviewedAt,
      reviewedBy: review.reviewedBy,
      factReviews: review.factReviews,
      temporalReview: review.temporalReview,
      separationReview: review.separationReview,
      unresolvedFacts: review.unresolvedFacts,
      localMaterialSources: (review.localMaterialSupplements ?? []).map(
        (supplement) => ({
          sourceType: 'local-document',
          documentPath: supplement.documentPath,
          supports: supplement.fields,
          note: supplement.note,
        }),
      ),
    },
    mediaDelivery: {
      status: 'pre-upload-object',
      version,
      productionBaseUrl: null,
    },
    heroImage: heroAsset.url,
    heroFocus: { x: 50, y: 50 },
    heroAsset,
    photos,
    video: {
      url: videoAsset.url,
      poster: posterAsset.url,
      captions: captionsAsset.url,
      asset: videoAsset,
      posterAsset,
      captionsAsset,
      posterReview: {
        aiWatermarkPresent: media.poster.aiWatermarkPresent,
        aiWatermarkAccepted: media.poster.aiWatermarkAccepted,
        disclosurePath: MEDIA_RIGHTS_PATH,
        acceptedBy: watermarkDisclosure?.acceptedBy ?? null,
        acceptedAt: watermarkDisclosure?.acceptedAt ?? null,
      },
      captionsReview: {
        reviewedAgainst: media.captions.reviewedAgainst,
        reviewedBy: media.captions.reviewedBy,
        reviewedAt: media.captions.reviewedAt,
      },
    },
    media: [
      {
        type: 'video',
        src: videoAsset.url,
        poster: posterAsset.url,
        captions: captionsAsset.url,
      },
      ...photos.map((photo) => ({
        type: 'image',
        src: photo.src,
        alt: photo.alt,
      })),
    ],
    mediaRights: {
      declarationPath: MEDIA_RIGHTS_PATH,
      declarationDate: rights.declarationDate,
      declaredBy: rights.declaredBy,
      statement: rights.statement,
      identifiablePeopleApproved: rights.scope.identifiablePeople,
    },
  };
}

export function generateSites(root = process.cwd()) {
  const resolvedRoot = resolve(root);
  const contentErrors = validateProductionContent(resolvedRoot);
  const mediaErrors = checkMedia(resolvedRoot);
  const inputErrors = [...contentErrors, ...mediaErrors];
  if (inputErrors.length > 0) {
    throw new Error(
      `Cannot generate sites from invalid reviewed inputs:\n${inputErrors
        .map((error) => `- ${error}`)
        .join('\n')}`,
    );
  }

  const manifest = readJson(resolvedRoot, MEDIA_MANIFEST_PATH);
  const rights = readJson(resolvedRoot, MEDIA_RIGHTS_PATH);
  const mediaById = new Map(manifest.sites.map((site) => [site.id, site]));
  const sites = REQUIRED_SITE_IDS.map((siteId) =>
    createSite({
      site: readJson(resolvedRoot, `content/sites/${siteId}.json`),
      sources: readJson(resolvedRoot, `content/sources/${siteId}.json`),
      review: readJson(resolvedRoot, `content/reviews/${siteId}.json`),
      media: mediaById.get(siteId),
      rights,
      version: manifest.version,
    }),
  );

  return productionSiteCollectionSchema.parse(sites);
}

export function serializeSites(sites) {
  return `${JSON.stringify(sites, null, 2)}\n`;
}

function parseArguments(argv) {
  const options = {
    output: 'src/data/sites.json',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--output') {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error('--output requires a path');
    }
    options.output = value;
    index += 1;
  }
  return options;
}

export function runGenerateSites(argv = process.argv.slice(2)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const options = parseArguments(argv);
  const outputPath = resolve(root, options.output);
  const output = serializeSites(generateSites(root));
  writeFileSync(outputPath, output);
  console.log(
    `[generate:sites] wrote 8 verified sites to ${outputPath} (${Buffer.byteLength(output)} bytes)`,
  );
  return 0;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    process.exitCode = runGenerateSites();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
