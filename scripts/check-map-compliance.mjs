import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAbsolute, relative, resolve } from 'node:path';

const placeholderPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid|test)/i;
const reviewNumberPattern = /^GS\(\d{4}\)\d{4,6}号$/;
const sha256Pattern = /^[a-f0-9]{64}$/i;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(record, field, errors) {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length < 2) {
    errors.push(`${field}: must be a non-placeholder text value`);
    return undefined;
  }
  return value.trim();
}

function validateHttpsUrl(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field}: is required`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${field}: must be a valid HTTPS URL`);
    return;
  }

  if (parsed.protocol !== 'https:') errors.push(`${field}: must use HTTPS`);
  if (placeholderPattern.test(parsed.hostname)) {
    errors.push(`${field}: placeholder or test domains are forbidden`);
  }
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function resolveInsideRoot(root, resourcePath) {
  const absolutePath = resolve(root, resourcePath.replace(/^[/\\]+/, ''));
  const relativePath = relative(root, absolutePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) return undefined;
  return absolutePath;
}

function validateLocalResource(resource, root, errors) {
  const pathValue = requireText(resource, 'path', errors);
  const digest = resource.sha256;

  if (typeof digest !== 'string' || !sha256Pattern.test(digest)) {
    errors.push('resource.sha256: must be a 64-character SHA-256 digest');
  }
  if (!pathValue) return;

  const absolutePath = resolveInsideRoot(root, pathValue);
  if (!absolutePath) {
    errors.push('resource.path: must stay inside the configured root');
    return;
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    errors.push(`resource.path: does not exist as a file (${pathValue})`);
    return;
  }
  if (typeof digest === 'string' && sha256Pattern.test(digest)) {
    const actualDigest = createHash('sha256')
      .update(readFileSync(absolutePath))
      .digest('hex');
    if (actualDigest.toLowerCase() !== digest.toLowerCase()) {
      errors.push(
        `resource.sha256: does not match ${pathValue} (actual ${actualDigest})`,
      );
    }
  }
}

export function validateMapComplianceRecord(input, { root = process.cwd() } = {}) {
  const errors = [];
  const resolvedRoot = resolve(root);

  if (!isRecord(input)) return ['mapCompliance: must be a JSON object'];

  if (input.status === 'blocked') {
    errors.push('status: blocked records prohibit public release');
    if (input.publicUseAllowed !== false) {
      errors.push('publicUseAllowed: blocked records must set false');
    }
    requireText(input, 'reason', errors);
    if (!Array.isArray(input.missingFields) || input.missingFields.length === 0) {
      errors.push('missingFields: blocked records must list missing inputs');
    } else {
      errors.push(`missingFields: ${input.missingFields.join(', ')}`);
    }
    return errors;
  }

  if (input.status !== 'verified') {
    return ['status: must be either blocked or verified'];
  }

  if (input.publicUseAllowed !== true) {
    errors.push('publicUseAllowed: verified records must set true');
  }
  requireText(input, 'resourceName', errors);
  requireText(input, 'publisher', errors);
  requireText(input, 'usageScope', errors);
  const reviewer = requireText(input, 'verifiedBy', errors);
  if (reviewer && /(?:todo|tbd|待定|占位|测试|合成)/i.test(reviewer)) {
    errors.push('verifiedBy: placeholder reviewers are forbidden');
  }

  if (
    input.authorityType !== 'natural-resources-authority' &&
    input.authorityType !== 'licensed-map-service'
  ) {
    errors.push(
      'authorityType: must identify a natural-resources authority or licensed map service',
    );
  }

  validateHttpsUrl(input.sourceUrl, 'sourceUrl', errors);

  if (
    typeof input.reviewNumber !== 'string' ||
    !reviewNumberPattern.test(input.reviewNumber)
  ) {
    errors.push('reviewNumber: must match the standard GS(YYYY)NNNN号 format');
  }

  if (typeof input.verifiedAt !== 'string' || !isIsoDate(input.verifiedAt)) {
    errors.push('verifiedAt: must be a real YYYY-MM-DD date');
  }

  if (!isRecord(input.resource)) {
    errors.push('resource: an actual local resource or runtime HTTPS URL is required');
  } else if (input.resource.type === 'local') {
    validateLocalResource(input.resource, resolvedRoot, errors);
  } else if (input.resource.type === 'remote') {
    validateHttpsUrl(input.resource.url, 'resource.url', errors);
  } else {
    errors.push('resource.type: must be local or remote');
  }

  if (!isRecord(input.humanReview)) {
    errors.push('humanReview: completed territory checks are required');
  } else {
    [
      'fullTerritory',
      'nationalBoundaries',
      'administrativeBoundaries',
      'islands',
    ].forEach((field) => {
      if (input.humanReview[field] !== true) {
        errors.push(`humanReview.${field}: must be completed manually`);
      }
    });
  }

  return errors;
}

function parseArguments(argv) {
  const options = { root: process.cwd(), map: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--map' && argument !== '--root') {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a path`);
    }
    if (argument === '--map') options.map = value;
    if (argument === '--root') options.root = value;
    index += 1;
  }
  return options;
}

export function runMapComplianceCheck(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const root = resolve(options.root);
  const mapPath = resolve(root, options.map ?? 'src/data/mapCompliance.json');

  if (!existsSync(mapPath)) {
    console.error(`[map] ${mapPath}: mapCompliance.json is missing`);
    return 1;
  }

  const input = JSON.parse(readFileSync(mapPath, 'utf8'));
  const errors = validateMapComplianceRecord(input, { root });
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[map] ${mapPath}: ${error}`));
    return 1;
  }

  console.log(`[map] ${mapPath}: compliance checks passed`);
  return 0;
}

const isCommandLine =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCommandLine) {
  try {
    process.exitCode = runMapComplianceCheck();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
