import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const REQUIRED_SITE_IDS = Object.freeze([
  'sihong-memorial',
  'yuhuatai-martyrs',
  'dujiang-victory',
  'sihang-warehouse',
  'cpc-first-congress',
  'jiangshangqing-memorial',
  'yangzhou-martyrs',
  'meiyuan-new-village',
]);

export const REQUIRED_FACT_FIELDS = Object.freeze([
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

const TIME_SENSITIVE_FIELDS = new Set(['opening', 'reservation', 'visitNotice']);
const AUTHORITY_TYPES = new Set([
  'venue-official',
  'government',
  'culture-tourism',
  'authoritative-memorial',
  'government-origin-republication',
]);
const PLACEHOLDER_URL = /(?:example\.(?:com|org|net)|invalid|placeholder|todo|待补)/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDate(value) {
  if (!nonEmpty(value) || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function readJson(path, label, errors) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${label} must be readable JSON: ${error.message}`);
    return null;
  }
}

function checkExactFiles(root, directory, errors) {
  const absoluteDirectory = join(root, 'content', directory);
  let files;
  try {
    files = readdirSync(absoluteDirectory).filter((file) => file.endsWith('.json'));
  } catch {
    errors.push(`content/${directory} directory is missing`);
    return;
  }
  const expected = new Set(REQUIRED_SITE_IDS.map((siteId) => `${siteId}.json`));
  for (const file of expected) {
    if (!files.includes(file)) errors.push(`content/${directory}/${file} is missing`);
  }
  for (const file of files) {
    if (!expected.has(file)) errors.push(`content/${directory}/${file} is unexpected`);
  }
}

function validateSourceFile(sourceFile, siteId, today, errors) {
  const prefix = `content/sources/${siteId}.json`;
  const sourceMap = new Map();
  if (!isRecord(sourceFile) || sourceFile.siteId !== siteId) {
    errors.push(`${prefix} siteId must equal ${siteId}`);
    return sourceMap;
  }
  if (!Array.isArray(sourceFile.sources) || sourceFile.sources.length === 0) {
    errors.push(`${prefix} sources must contain at least one source`);
    return sourceMap;
  }
  sourceFile.sources.forEach((source, index) => {
    const label = `${prefix} sources[${index}]`;
    if (!isRecord(source)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!nonEmpty(source.id)) errors.push(`${label}.id is required`);
    else if (sourceMap.has(source.id)) errors.push(`${label}.id must be unique`);
    else sourceMap.set(source.id, source);
    for (const field of ['title', 'publisher']) {
      if (!nonEmpty(source[field])) errors.push(`${label}.${field} is required`);
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(source.url);
    } catch {
      errors.push(`${label}.url must be an exact HTTPS URL`);
    }
    if (parsedUrl && parsedUrl.protocol !== 'https:') {
      errors.push(`${label}.url must be an exact HTTPS URL`);
    }
    if (nonEmpty(source.url) && PLACEHOLDER_URL.test(source.url)) {
      errors.push(`${label} has a placeholder URL`);
    }
    if (!validDate(source.accessedAt)) errors.push(`${label}.accessedAt must be YYYY-MM-DD`);
    else if (source.accessedAt > today) errors.push(`${label}.accessedAt cannot be in the future`);
    if (!AUTHORITY_TYPES.has(source.authorityType)) {
      errors.push(`${label}.authorityType is not an accepted authoritative source type`);
    }
    if (!Array.isArray(source.supports) || source.supports.length === 0) {
      errors.push(`${label}.supports must list supported fact fields`);
    } else {
      for (const field of source.supports) {
        if (!REQUIRED_FACT_FIELDS.includes(field)) {
          errors.push(`${label}.supports contains unknown field ${field}`);
        }
      }
    }
    if (source.supports?.some((field) => TIME_SENSITIVE_FIELDS.has(field))) {
      if (!isRecord(source.temporal)) {
        errors.push(`${label}.temporal is required for time-sensitive facts`);
      } else {
        if (!validDate(source.temporal.checkedAt)) {
          errors.push(`${label}.temporal.checkedAt must be YYYY-MM-DD`);
        }
        if (!validDate(source.temporal.validThrough)) {
          errors.push(`${label}.temporal.validThrough must be YYYY-MM-DD`);
        } else if (source.temporal.validThrough < today) {
          errors.push(`${label}.temporal is expired at ${source.temporal.validThrough}`);
        }
      }
    }
  });
  return sourceMap;
}

function validateSiteFile(site, siteId, sourceMap, errors) {
  const prefix = `content/sites/${siteId}.json`;
  if (!isRecord(site) || site.id !== siteId) {
    errors.push(`${prefix} id must equal ${siteId}`);
    return;
  }
  for (const field of ['officialName', 'shortName', 'province', 'city', 'district', 'address']) {
    if (!nonEmpty(site[field])) errors.push(`${prefix}.${field} is required`);
  }
  if (!isRecord(site.coordinates) || !Number.isFinite(site.coordinates.lat) || !Number.isFinite(site.coordinates.lng)) {
    errors.push(`${prefix}.coordinates must contain numeric lat and lng`);
  }
  if (!isRecord(site.basicInformation)) {
    errors.push(`${prefix}.basicInformation is required`);
  } else {
    for (const field of ['opening', 'reservation', 'visitNotice']) {
      if (!nonEmpty(site.basicInformation[field])) errors.push(`${prefix}.basicInformation.${field} is required`);
    }
  }
  for (const field of ['historicalImprint', 'peopleStories', 'exhibitsAndSiteMeaning', 'spiritualLegacy']) {
    if (!nonEmpty(site[field])) errors.push(`${prefix}.${field} is required`);
  }
  if (!isRecord(site.teamReflection) || site.teamReflection.type !== 'team-reflection' || !nonEmpty(site.teamReflection.text)) {
    errors.push(`${prefix}.teamReflection must be a separate team-reflection block`);
  }
  if (!isRecord(site.factSourceMap)) {
    errors.push(`${prefix}.factSourceMap is required`);
  } else {
    for (const field of REQUIRED_FACT_FIELDS) {
      const ids = site.factSourceMap[field];
      if (!Array.isArray(ids) || ids.length === 0) {
        errors.push(`${prefix}.${field} requires a source mapping`);
        continue;
      }
      for (const sourceId of ids) {
        const source = sourceMap.get(sourceId);
        if (!source) errors.push(`${prefix}.${field} maps unknown source ${sourceId}`);
        else if (!source.supports.includes(field)) {
          errors.push(`${prefix}.${field} maps source ${sourceId} that does not support ${field}`);
        }
      }
    }
    if ('teamReflection' in site.factSourceMap) {
      errors.push(`${prefix}.teamReflection must not have a fact source mapping`);
    }
  }
  if (siteId === 'cpc-first-congress') {
    if (site.markerAddress !== '上海市黄浦区兴业路76号' || site.address !== '上海市黄浦区黄陂南路374号') {
      errors.push(`${prefix} must keep marker at 兴业路76号 and visitor address at 黄陂南路374号`);
    }
  }
}

function validateReviewFile(review, site, siteId, sourceMap, today, errors) {
  const prefix = `content/reviews/${siteId}.json`;
  if (!isRecord(review) || review.siteId !== siteId) {
    errors.push(`${prefix} siteId must equal ${siteId}`);
    return;
  }
  if (review.status !== 'verified') errors.push(`${prefix}.status must be verified`);
  if (!validDate(review.reviewedAt) || review.reviewedAt > today) {
    errors.push(`${prefix}.reviewedAt must be a valid non-future date`);
  }
  if (!nonEmpty(review.reviewedBy)) errors.push(`${prefix}.reviewedBy is required`);
  if (!isRecord(review.factReviews)) {
    errors.push(`${prefix}.factReviews is required`);
  } else {
    for (const field of REQUIRED_FACT_FIELDS) {
      const factReview = review.factReviews[field];
      if (!isRecord(factReview) || factReview.status !== 'verified') {
        errors.push(`${prefix}.${field} must be verified`);
        continue;
      }
      if (!Array.isArray(factReview.sourceIds) || factReview.sourceIds.length === 0) {
        errors.push(`${prefix}.${field} must list reviewed source IDs`);
      } else {
        for (const sourceId of factReview.sourceIds) {
          if (!sourceMap.has(sourceId)) errors.push(`${prefix}.${field} reviews unknown source ${sourceId}`);
        }
        const mappedSourceIds = isRecord(site?.factSourceMap) ? site.factSourceMap[field] : [];
        if (
          Array.isArray(mappedSourceIds) &&
          mappedSourceIds.some((sourceId) => !factReview.sourceIds.includes(sourceId))
        ) {
          errors.push(`${prefix}.${field} review must include every mapped source`);
        }
      }
    }
  }
  if (!isRecord(review.temporalReview)) {
    errors.push(`${prefix}.temporalReview is required`);
  } else {
    if (!validDate(review.temporalReview.checkedAt)) errors.push(`${prefix}.temporalReview.checkedAt is invalid`);
    if (!validDate(review.temporalReview.validThrough)) errors.push(`${prefix}.temporalReview.validThrough is invalid`);
    else if (review.temporalReview.validThrough < today) {
      errors.push(`${prefix}.temporalReview is expired at ${review.temporalReview.validThrough}`);
    }
  }
  if (
    !isRecord(review.separationReview) ||
    review.separationReview.factAndReflectionSeparated !== true ||
    review.separationReview.reflectionIntroducesNewFacts !== false
  ) {
    errors.push(`${prefix}.separationReview must confirm facts and reflection are separated`);
  }
  if (!Array.isArray(review.unresolvedFacts)) {
    errors.push(`${prefix}.unresolvedFacts must be an array`);
  } else {
    review.unresolvedFacts.forEach((fact, index) => {
      if (!isRecord(fact) || fact.excludedFromPublishedCopy !== true) {
        errors.push(`${prefix}.unresolvedFacts[${index}] must be excluded from published copy`);
      }
    });
  }
  if (review.localMaterialSupplements !== undefined) {
    if (!Array.isArray(review.localMaterialSupplements)) {
      errors.push(`${prefix}.localMaterialSupplements must be an array`);
    } else {
      review.localMaterialSupplements.forEach((supplement, index) => {
        const label = `${prefix}.localMaterialSupplements[${index}]`;
        if (!isRecord(supplement)) {
          errors.push(`${label} must be an object`);
          return;
        }
        if (!nonEmpty(supplement.documentPath)) errors.push(`${label}.documentPath is required`);
        if (
          !Array.isArray(supplement.fields) ||
          supplement.fields.length === 0 ||
          supplement.fields.some((field) => !REQUIRED_FACT_FIELDS.includes(field))
        ) {
          errors.push(`${label}.fields must list known fact fields`);
        }
        if (!nonEmpty(supplement.note)) errors.push(`${label}.note is required`);
      });
    }
  }
}

export function validateProductionContent(root = process.cwd(), options = {}) {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const errors = [];
  if (!validDate(today)) return [`today must be a valid YYYY-MM-DD date: ${today}`];
  for (const directory of ['sources', 'sites', 'reviews']) checkExactFiles(root, directory, errors);
  for (const siteId of REQUIRED_SITE_IDS) {
    const sourceFile = readJson(join(root, 'content', 'sources', `${siteId}.json`), `content/sources/${siteId}.json`, errors);
    const siteFile = readJson(join(root, 'content', 'sites', `${siteId}.json`), `content/sites/${siteId}.json`, errors);
    const reviewFile = readJson(join(root, 'content', 'reviews', `${siteId}.json`), `content/reviews/${siteId}.json`, errors);
    const sourceMap = validateSourceFile(sourceFile, siteId, today, errors);
    validateSiteFile(siteFile, siteId, sourceMap, errors);
    validateReviewFile(reviewFile, siteFile, siteId, sourceMap, today, errors);
  }
  return errors;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const projectRoot = resolve(dirname(modulePath), '..');
  const errors = validateProductionContent(projectRoot);
  if (errors.length > 0) {
    console.error(`Production content check failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`Production content check passed: ${REQUIRED_SITE_IDS.length} sites, ${REQUIRED_FACT_FIELDS.length} fact fields each.`);
  }
}
