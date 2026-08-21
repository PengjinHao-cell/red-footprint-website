import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

export type BlockedMapCompliance = {
  status: 'blocked';
  publicUseAllowed: false;
  reason: string;
  missingFields: string[];
};

export type VerifiedMapCompliance = {
  status: 'verified';
  publicUseAllowed: true;
  resourceName: string;
  publisher: string;
  authorityType: 'natural-resources-authority' | 'licensed-map-service';
  sourceUrl: string;
  resource:
    | { type: 'local'; path: string; sha256: string }
    | { type: 'remote'; url: string };
  reviewNumber: string;
  usageScope: string;
  verifiedAt: string;
  verifiedBy: string;
  humanReview: {
    fullTerritory: true;
    nationalBoundaries: true;
    administrativeBoundaries: true;
    islands: true;
  };
};

export type MapCompliance = BlockedMapCompliance | VerifiedMapCompliance;

type ValidationOptions = {
  root?: string;
};

const placeholderPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid|test)/i;
const reviewNumberPattern = /^GS\(\d{4}\)\d{4,6}号$/;
const sha256Pattern = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(
  record: Record<string, unknown>,
  field: string,
  errors: string[],
) {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length < 2) {
    errors.push(`${field}: must be a non-placeholder text value`);
    return undefined;
  }
  return value.trim();
}

function validateHttpsUrl(value: unknown, field: string, errors: string[]) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field}: is required`);
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${field}: must be a valid HTTPS URL`);
    return;
  }

  if (parsed.protocol !== 'https:') {
    errors.push(`${field}: must use HTTPS`);
  }
  if (placeholderPattern.test(parsed.hostname)) {
    errors.push(`${field}: placeholder or test domains are forbidden`);
  }
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function resolveInsideRoot(root: string, resourcePath: string) {
  const absolutePath = resolve(root, resourcePath.replace(/^[/\\]+/, ''));
  const relativePath = relative(root, absolutePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) return undefined;
  return absolutePath;
}

function validateLocalResource(
  resource: Record<string, unknown>,
  root: string,
  errors: string[],
) {
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

export function validateMapCompliance(
  input: unknown,
  options: ValidationOptions = {},
): string[] {
  const errors: string[] = [];
  const root = resolve(options.root ?? process.cwd());

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
    validateLocalResource(input.resource, root, errors);
  } else if (input.resource.type === 'remote') {
    validateHttpsUrl(input.resource.url, 'resource.url', errors);
  } else {
    errors.push('resource.type: must be local or remote');
  }

  if (!isRecord(input.humanReview)) {
    errors.push('humanReview: completed territory checks are required');
  } else {
    const humanReview = input.humanReview;
    [
      'fullTerritory',
      'nationalBoundaries',
      'administrativeBoundaries',
      'islands',
    ].forEach((field) => {
      if (humanReview[field] !== true) {
        errors.push(`humanReview.${field}: must be completed manually`);
      }
    });
  }

  return errors;
}
