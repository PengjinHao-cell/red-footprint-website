import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MEDIA_MANIFEST_PATH = 'content/media/media-manifest.json';
const RELEASE_MANIFEST_PATH = 'content/cloudbase/object-release-manifest.json';
const RECONCILIATION_PATH = 'content/cloudbase/upload-reconciliation.json';
const SHA256 = /^[a-f0-9]{64}$/;

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function normalMime(value) {
  return typeof value === 'string'
    ? value.split(';', 1)[0].trim().toLowerCase()
    : '';
}

export function flattenMediaManifest(manifest) {
  if (!isRecord(manifest) || !Array.isArray(manifest.sites)) return [];
  const objects = [];
  for (const site of manifest.sites) {
    objects.push({ siteId: site.id, kind: 'hero', ...site.hero });
    for (const photo of site.photos ?? []) {
      objects.push({ siteId: site.id, kind: 'photo', ...photo });
    }
    objects.push(
      { siteId: site.id, kind: 'video', ...site.video },
      { siteId: site.id, kind: 'poster', ...site.poster },
      { siteId: site.id, kind: 'captions', ...site.captions },
    );
  }
  return objects.map(({ siteId, kind, objectPath, bytes, mime, sha256 }) => ({
    siteId,
    kind,
    objectPath,
    bytes,
    mime,
    sha256,
  }));
}

export function buildObjectReleaseManifest(manifest, options) {
  const objects = flattenMediaManifest(manifest);
  return {
    schemaVersion: 1,
    environmentId: options.environmentId,
    region: options.region,
    bucket: options.bucket,
    version: manifest.version,
    targetPrefix: 'media/sites/*/v1/',
    releasedAt: options.releasedAt,
    objectCount: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.bytes, 0),
    writePolicy: {
      createOnly: true,
      overwrite: false,
      delete: false,
      modifyPermissions: false,
    },
    objects,
  };
}

export function validateObjectReleaseManifest(mediaManifest, releaseManifest) {
  const errors = [];
  const expectedObjects = flattenMediaManifest(mediaManifest);
  if (!isRecord(releaseManifest) || releaseManifest.schemaVersion !== 1) {
    return ['release manifest schemaVersion must be 1'];
  }
  if (releaseManifest.version !== mediaManifest?.version) {
    errors.push('release manifest version must match media manifest');
  }
  if (releaseManifest.targetPrefix !== 'media/sites/*/v1/') {
    errors.push('release manifest targetPrefix must be media/sites/*/v1/');
  }
  if (
    !releaseManifest.environmentId ||
    !releaseManifest.region ||
    !releaseManifest.bucket
  ) {
    errors.push('release manifest environment, region, and bucket are required');
  }
  if (
    releaseManifest.writePolicy?.createOnly !== true ||
    releaseManifest.writePolicy?.overwrite !== false ||
    releaseManifest.writePolicy?.delete !== false ||
    releaseManifest.writePolicy?.modifyPermissions !== false
  ) {
    errors.push('release manifest must enforce create-only writes');
  }
  if (
    releaseManifest.objectCount !== expectedObjects.length ||
    !Array.isArray(releaseManifest.objects) ||
    releaseManifest.objects.length !== expectedObjects.length
  ) {
    errors.push(
      `release manifest must contain exactly ${expectedObjects.length} objects`,
    );
  }
  const expectedBytes = expectedObjects.reduce(
    (sum, object) => sum + object.bytes,
    0,
  );
  if (releaseManifest.totalBytes !== expectedBytes) {
    errors.push('release manifest totalBytes must match media manifest');
  }
  const byPath = new Map(
    (releaseManifest.objects ?? []).map((object) => [object.objectPath, object]),
  );
  if (byPath.size !== (releaseManifest.objects ?? []).length) {
    errors.push('release manifest object paths must be unique');
  }
  for (const expected of expectedObjects) {
    const actual = byPath.get(expected.objectPath);
    if (!actual) {
      errors.push(`release manifest missing ${expected.objectPath}`);
      continue;
    }
    for (const field of ['siteId', 'kind', 'bytes', 'mime', 'sha256']) {
      if (actual[field] !== expected[field]) {
        errors.push(
          `release manifest ${expected.objectPath}.${field} must match media manifest`,
        );
      }
    }
  }
  return errors;
}

function validateHttpsBaseUrl(value, bucket, errors) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push('cdnBaseUrl must be a valid HTTPS URL');
    return null;
  }
  if (parsed.protocol !== 'https:') {
    errors.push('cdnBaseUrl must use HTTPS');
  }
  if (
    /(^|\.)(example\.(?:com|test)|localhost|invalid)$/i.test(parsed.hostname) ||
    parsed.hostname.endsWith('.example.test')
  ) {
    errors.push('cdnBaseUrl must not use a placeholder domain');
  }
  if (parsed.hostname !== `${bucket}.tcb.qcloud.la`) {
    errors.push('cdnBaseUrl domain must match the reconciled CloudBase bucket');
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    errors.push('cdnBaseUrl must not contain a path, query, or fragment');
  }
  return parsed;
}

export function validateUploadReconciliation(
  mediaManifest,
  releaseManifest,
  reconciliation,
) {
  const errors = validateObjectReleaseManifest(mediaManifest, releaseManifest);
  const expectedObjects = flattenMediaManifest(mediaManifest);
  if (!isRecord(reconciliation) || reconciliation.schemaVersion !== 1) {
    return [...errors, 'upload reconciliation schemaVersion must be 1'];
  }
  for (const field of ['environmentId', 'region', 'bucket', 'version']) {
    if (reconciliation[field] !== releaseManifest[field]) {
      errors.push(`upload reconciliation ${field} must match release manifest`);
    }
  }
  validateHttpsBaseUrl(
    reconciliation.cdnBaseUrl,
    releaseManifest.bucket,
    errors,
  );
  if (
    reconciliation.operations?.created !== expectedObjects.length ||
    reconciliation.operations?.overwritten !== 0 ||
    reconciliation.operations?.deleted !== 0 ||
    reconciliation.operations?.permissionsModified !== false
  ) {
    errors.push(
      `upload reconciliation operations must record ${expectedObjects.length} create-only writes`,
    );
  }
  if (
    reconciliation.objectCount !== expectedObjects.length ||
    !Array.isArray(reconciliation.objects) ||
    reconciliation.objects.length !== expectedObjects.length
  ) {
    errors.push(
      `upload reconciliation must contain exactly ${expectedObjects.length} objects`,
    );
  }
  if (reconciliation.totalBytes !== releaseManifest.totalBytes) {
    errors.push('upload reconciliation totalBytes must match release manifest');
  }
  const byPath = new Map(
    (reconciliation.objects ?? []).map((object) => [object.objectPath, object]),
  );
  if (byPath.size !== (reconciliation.objects ?? []).length) {
    errors.push('upload reconciliation object paths must be unique');
  }
  for (const expected of expectedObjects) {
    const actual = byPath.get(expected.objectPath);
    if (!actual) {
      errors.push(`upload reconciliation missing ${expected.objectPath}`);
      continue;
    }
    for (const field of ['bytes', 'mime', 'sha256']) {
      if (actual[field] !== expected[field]) {
        errors.push(
          `upload reconciliation ${expected.objectPath}.${field} must match media manifest`,
        );
      }
    }
    const expectedUrl = `${reconciliation.cdnBaseUrl}/${expected.objectPath}`;
    if (typeof actual.httpsUrl !== 'string' || !actual.httpsUrl.startsWith('https://')) {
      errors.push(`upload reconciliation ${expected.objectPath}.httpsUrl must use HTTPS`);
    } else if (actual.httpsUrl !== expectedUrl) {
      errors.push(
        `upload reconciliation ${expected.objectPath}.httpsUrl must match the CloudBase CDN path`,
      );
    }
    if (actual.cloud?.exists !== true) {
      errors.push(`upload reconciliation ${expected.objectPath} must exist in CloudBase`);
    }
    if (actual.cloud?.bytes !== expected.bytes) {
      errors.push(`upload reconciliation ${expected.objectPath} cloud bytes must match`);
    }
    if (normalMime(actual.cloud?.mime) !== normalMime(expected.mime)) {
      errors.push(`upload reconciliation ${expected.objectPath} cloud MIME must match`);
    }
    if (actual.http?.status !== 200) {
      errors.push(`upload reconciliation ${expected.objectPath} HTTPS status must be 200`);
    }
    if (actual.http?.bytes !== expected.bytes) {
      errors.push(`upload reconciliation ${expected.objectPath} HTTPS bytes must match`);
    }
    if (normalMime(actual.http?.mime) !== normalMime(expected.mime)) {
      errors.push(`upload reconciliation ${expected.objectPath} HTTPS MIME must match`);
    }
    if (actual.http?.sha256 !== expected.sha256 || !SHA256.test(actual.http?.sha256 ?? '')) {
      errors.push(`upload reconciliation ${expected.objectPath} HTTPS sha256 must match`);
    }
    if (expected.mime === 'video/mp4') {
      const range = actual.http?.range;
      if (
        range?.request !== 'bytes=0-1023' ||
        range?.status !== 206 ||
        range?.contentRange !== `bytes 0-1023/${expected.bytes}`
      ) {
        errors.push(`upload reconciliation ${expected.objectPath} Range evidence must match`);
      }
    }
    if (expected.mime === 'image/webp' && actual.http?.webpSignature !== true) {
      errors.push(`upload reconciliation ${expected.objectPath} must have a WebP signature`);
    }
    if (
      expected.mime.startsWith('text/vtt') &&
      actual.http?.webVtt !== true
    ) {
      errors.push(`upload reconciliation ${expected.objectPath} must be valid WebVTT`);
    }
  }
  return errors;
}

export function readReconciledDelivery(root, mediaManifest) {
  const releasePath = join(root, RELEASE_MANIFEST_PATH);
  const reconciliationPath = join(root, RECONCILIATION_PATH);
  if (!existsSync(releasePath) || !existsSync(reconciliationPath)) return null;
  try {
    const release = readJson(root, RELEASE_MANIFEST_PATH);
    const reconciliation = readJson(root, RECONCILIATION_PATH);
    const errors = validateUploadReconciliation(
      mediaManifest,
      release,
      reconciliation,
    );
    if (errors.length > 0) return null;
    return {
      productionBaseUrl: reconciliation.cdnBaseUrl,
      objects: new Map(
        reconciliation.objects.map((object) => [
          object.objectPath,
          object.httpsUrl,
        ]),
      ),
    };
  } catch {
    return null;
  }
}

export function checkUploadReconciliation(root = process.cwd()) {
  const errors = [];
  let mediaManifest;
  let releaseManifest;
  let reconciliation;
  try {
    mediaManifest = readJson(root, MEDIA_MANIFEST_PATH);
  } catch (error) {
    errors.push(`media manifest is unreadable: ${error.message}`);
  }
  try {
    releaseManifest = readJson(root, RELEASE_MANIFEST_PATH);
  } catch (error) {
    errors.push(`object release manifest is unreadable: ${error.message}`);
  }
  try {
    reconciliation = readJson(root, RECONCILIATION_PATH);
  } catch (error) {
    errors.push(`upload reconciliation is unreadable: ${error.message}`);
  }
  if (mediaManifest && releaseManifest && reconciliation) {
    errors.push(
      ...validateUploadReconciliation(
        mediaManifest,
        releaseManifest,
        reconciliation,
      ),
    );
  }
  return errors;
}

export function formatUploadReconciliationSuccess(reconciliation) {
  return `Upload reconciliation passed: ${reconciliation.objectCount} immutable CloudBase v1 objects verified.`;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const root = resolve(dirname(modulePath), '..');
  const errors = checkUploadReconciliation(root);
  if (errors.length > 0) {
    console.error(`Upload reconciliation check failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    const reconciliation = readJson(root, RECONCILIATION_PATH);
    console.log(formatUploadReconciliationSuccess(reconciliation));
  }
}
