import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const officialNames = [
  '淮北抗日民主根据地纪念馆',
  '雨花台烈士陵园',
  '渡江胜利纪念馆',
  '上海四行仓库抗战纪念馆',
  '中国共产党第一次全国代表大会纪念馆',
  '江上青烈士史料陈列馆',
  '扬州革命烈士陵园',
  '中国共产党代表团梅园新村纪念馆',
];

const factModules = [
  'officialName',
  'shortName',
  'province',
  'city',
  'district',
  'address',
  'coordinates',
  'opening',
  'reservation',
  'visitNotice',
  'officialTitle',
  'history',
  'people',
  'spirit',
  'reflection',
];

const requiredTextFields = [
  'officialName',
  'shortName',
  'city',
  'district',
  'address',
  'opening',
  'reservation',
  'visitNotice',
  'officialTitle',
  'history',
  'people',
  'spirit',
  'reflection',
];

const placeholderHostPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid|test)/i;
const placeholderReferencePattern =
  /(?:placeholder|synthetic|fixture|invalid|test-data|todo|tbd|待补|占位|合成路径|测试路径|AI生成|豆包)/i;
const genericAltPattern = /^(?:照片|图片|图|照片\s*\d+|图片\s*\d+)$/i;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function hasReviewableText(value, minimum = 2) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function validateHttpsUrl(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`[schema] ${field}: is required`);
    return false;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`[schema] ${field}: must be a valid HTTPS URL`);
    return false;
  }

  let valid = true;
  if (parsed.protocol !== 'https:') {
    errors.push(`[schema] ${field}: must use HTTPS`);
    valid = false;
  }
  if (placeholderHostPattern.test(parsed.hostname)) {
    errors.push(`[schema] ${field}: placeholder or test domains are forbidden`);
    valid = false;
  }
  return valid;
}

function resolveInside(base, reference) {
  const absolutePath = resolve(base, reference);
  const relativePath = relative(base, absolutePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) return undefined;
  return absolutePath;
}

function validateResource(reference, field, root, errors, { captions = false } = {}) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    errors.push(`[schema] ${field}: resource reference is required`);
    return;
  }

  if (placeholderReferencePattern.test(reference)) {
    errors.push(`[schema] ${field}: placeholder, synthetic, or AI-watermarked references are forbidden`);
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(reference)) {
    validateHttpsUrl(reference, field, errors);
    return;
  }

  const webRootReference = reference.startsWith('/');
  const base = webRootReference ? resolve(root, 'public') : root;
  const localReference = webRootReference ? reference.slice(1) : reference;
  const absolutePath = resolveInside(base, localReference);
  if (!absolutePath) {
    errors.push(`[schema] ${field}: local path must stay inside the configured root`);
    return;
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    errors.push(`[schema] ${field}: local resource does not exist (${reference})`);
    return;
  }
  if (captions) {
    const firstLine = readFileSync(absolutePath, 'utf8').split(/\r?\n/, 1)[0];
    if (firstLine.trim() !== 'WEBVTT') {
      errors.push(`[schema] ${field}: local caption file must begin with WEBVTT`);
    }
  }
}

function validateReview(record, field, errors) {
  if (!isRecord(record)) {
    errors.push(`[review] ${field}: verified review metadata is required`);
    return;
  }
  if (record.status !== 'verified') {
    errors.push(`[review] ${field}.status: must be verified`);
  }
  if (!isIsoDate(record.reviewedAt)) {
    errors.push(`[review] ${field}.reviewedAt: must be a real YYYY-MM-DD date`);
  }
  if (!hasReviewableText(record.reviewedBy)) {
    errors.push(`[review] ${field}.reviewedBy: reviewer is required`);
  }
}

function validateSite(site, index, root, errors) {
  const prefix = `sites[${index}]`;
  if (!isRecord(site)) {
    errors.push(`[schema] ${prefix}: must be an object`);
    return;
  }

  if (typeof site.id !== 'string' || !/^[a-z0-9-]+$/.test(site.id)) {
    errors.push(`[schema] ${prefix}.id: must use lowercase letters, numbers, and hyphens`);
  }
  requiredTextFields.forEach((field) => {
    if (!hasReviewableText(site[field])) {
      errors.push(`[schema] ${prefix}.${field}: non-empty reviewed text is required`);
    }
  });
  if (site.province !== '江苏省' && site.province !== '上海市') {
    errors.push(`[schema] ${prefix}.province: must be 江苏省 or 上海市`);
  }
  if (
    !isRecord(site.coordinates) ||
    typeof site.coordinates.lat !== 'number' ||
    typeof site.coordinates.lng !== 'number' ||
    site.coordinates.lat < -90 ||
    site.coordinates.lat > 90 ||
    site.coordinates.lng < -180 ||
    site.coordinates.lng > 180
  ) {
    errors.push(`[schema] ${prefix}.coordinates: valid latitude and longitude are required`);
  }
  if (
    !isRecord(site.heroFocus) ||
    typeof site.heroFocus.x !== 'number' ||
    typeof site.heroFocus.y !== 'number' ||
    site.heroFocus.x < 0 ||
    site.heroFocus.x > 100 ||
    site.heroFocus.y < 0 ||
    site.heroFocus.y > 100
  ) {
    errors.push(`[schema] ${prefix}.heroFocus: x and y must be between 0 and 100`);
  }

  validateResource(site.heroImage, `${prefix}.heroImage`, root, errors);

  if (!Array.isArray(site.photos) || site.photos.length < 1 || site.photos.length > 5) {
    errors.push(`[schema] ${prefix}.photos: must contain 1 to 5 selected photos`);
  }
  if (Array.isArray(site.photos)) {
    site.photos.forEach((photo, photoIndex) => {
      const photoPrefix = `${prefix}.photos[${photoIndex}]`;
      if (!isRecord(photo)) {
        errors.push(`[schema] ${photoPrefix}: must be an object`);
        return;
      }
      validateResource(photo.src, `${photoPrefix}.src`, root, errors);
      if (
        !hasReviewableText(photo.alt, 4) ||
        genericAltPattern.test(photo.alt.trim())
      ) {
        errors.push(`[schema] ${photoPrefix}.alt: reviewable visual description is required`);
      }
    });
  }

  if (!isRecord(site.video) || Object.hasOwn(site, 'videos')) {
    errors.push(`[schema] ${prefix}.video: exactly one video object is required`);
  } else {
    validateHttpsUrl(site.video.url, `${prefix}.video.url`, errors);
    validateResource(site.video.poster, `${prefix}.video.poster`, root, errors);
    validateResource(site.video.captions, `${prefix}.video.captions`, root, errors, {
      captions: true,
    });

    if (!isRecord(site.video.posterReview)) {
      errors.push(`[review] ${prefix}.video.posterReview: verified poster review is required`);
    } else {
      validateReview(site.video.posterReview, `${prefix}.video.posterReview`, errors);
      if (site.video.posterReview.aiWatermark !== false) {
        errors.push(
          `[review] ${prefix}.video.posterReview.aiWatermark: must be false`,
        );
      }
    }

  }
  if (Object.hasOwn(site, 'media')) {
    errors.push(
      `[schema] ${prefix}.media: must not override the fixed video first sequence`,
    );
  }

  validateReview(site.contentReview, `${prefix}.contentReview`, errors);

  const supportedFacts = new Set();
  if (!Array.isArray(site.sources) || site.sources.length === 0) {
    errors.push(`[review] ${prefix}.sources: at least one authoritative source is required`);
  } else {
    site.sources.forEach((source, sourceIndex) => {
      const sourcePrefix = `${prefix}.sources[${sourceIndex}]`;
      if (!isRecord(source)) {
        errors.push(`[review] ${sourcePrefix}: must be an object`);
        return;
      }
      if (!hasReviewableText(source.label)) {
        errors.push(`[review] ${sourcePrefix}.label: source name is required`);
      }
      if (!hasReviewableText(source.publisher)) {
        errors.push(`[review] ${sourcePrefix}.publisher: publishing authority is required`);
      }
      const validUrl = validateHttpsUrl(source.url, `${sourcePrefix}.url`, errors);
      if (source.authoritative !== true) {
        errors.push(`[review] ${sourcePrefix}.authoritative: must be true`);
      }
      if (!Array.isArray(source.supports) || source.supports.length === 0) {
        errors.push(`[review] ${sourcePrefix}.supports: supported fact modules are required`);
      } else if (
        validUrl &&
        source.authoritative === true &&
        hasReviewableText(source.publisher)
      ) {
        source.supports.forEach((field) => supportedFacts.add(field));
      }
    });
  }

  factModules.forEach((field) => {
    if (!supportedFacts.has(field)) {
      errors.push(
        `[review] ${prefix}.facts.${field}: requires at least one authoritative source`,
      );
    }
  });
}

export function validateContent(input, { root = process.cwd() } = {}) {
  const errors = [];
  const resolvedRoot = resolve(root);

  if (!Array.isArray(input)) return ['[schema] sites: must be a JSON array'];
  if (input.length !== 8) {
    errors.push(`[schema] sites: must contain exactly 8 sites (received ${input.length})`);
  }

  const ids = new Set();
  const names = new Set();
  input.forEach((site, index) => {
    validateSite(site, index, resolvedRoot, errors);
    if (!isRecord(site)) return;

    if (typeof site.id === 'string') {
      if (ids.has(site.id)) {
        errors.push(`[schema] sites[${index}].id: must be unique (${site.id})`);
      }
      ids.add(site.id);
    }
    if (typeof site.officialName === 'string') {
      if (!officialNames.includes(site.officialName)) {
        errors.push(
          `[schema] sites[${index}].officialName: ${site.officialName} is not in the confirmed list`,
        );
      }
      if (names.has(site.officialName)) {
        errors.push(
          `[schema] sites[${index}].officialName: must be unique (${site.officialName})`,
        );
      }
      names.add(site.officialName);
    }
  });

  officialNames.forEach((name) => {
    if (!names.has(name)) {
      errors.push(`[schema] sites.officialName: missing confirmed site ${name}`);
    }
  });

  return errors;
}

function parseArguments(argv) {
  const options = { root: process.cwd(), sites: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--sites' && argument !== '--root') {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a path`);
    }
    if (argument === '--sites') options.sites = value;
    if (argument === '--root') options.root = value;
    index += 1;
  }
  return options;
}

export function runContentCheck(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const root = resolve(options.root);
  const sitesPath = resolve(root, options.sites ?? 'src/data/sites.json');
  if (!existsSync(sitesPath)) {
    console.error(`[content] ${sitesPath}: sites.json is missing`);
    return 1;
  }

  const input = JSON.parse(readFileSync(sitesPath, 'utf8'));
  const errors = validateContent(input, { root });
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[content] ${sitesPath}: ${error}`));
    return 1;
  }

  console.log(`[content] ${sitesPath}: compliance checks passed`);
  return 0;
}

const isCommandLine =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCommandLine) {
  try {
    process.exitCode = runContentCheck();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
