import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_SITE_IDS = Object.freeze(['sihong-memorial', 'yuhuatai-martyrs', 'dujiang-victory', 'sihang-warehouse', 'cpc-first-congress', 'jiangshangqing-memorial', 'yangzhou-martyrs', 'meiyuan-new-village']);
export const EXPECTED_PHOTO_COUNTS = Object.freeze({
  'sihong-memorial': 2,
  'yuhuatai-martyrs': 5,
  'dujiang-victory': 5,
  'sihang-warehouse': 5,
  'cpc-first-congress': 5,
  'jiangshangqing-memorial': 1,
  'yangzhou-martyrs': 1,
  'meiyuan-new-village': 4,
});
const AI_WATERMARK_SITES = new Set(['yuhuatai-martyrs', 'jiangshangqing-memorial', 'yangzhou-martyrs']);
const SHA256 = /^[a-f0-9]{64}$/;
const VERSIONED_PATH = /^media\/sites\/([a-z0-9-]+)\/v1\/(hero|photos|video|poster|captions)\//;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

function checkAsset(asset, label, kind, errors, options) {
  if (!isRecord(asset)) { errors.push(`${label} must be an object`); return; }
  if (!nonEmpty(asset.sourcePath)) errors.push(`${label}.sourcePath is required`);
  if (!nonEmpty(asset.objectPath) || !VERSIONED_PATH.test(asset.objectPath)) errors.push(`${label}.objectPath must be a versioned media/sites/<site-id>/v1 path`);
  const expectedMime = kind === 'video' ? 'video/mp4' : kind === 'captions' ? 'text/vtt; charset=utf-8' : 'image/webp';
  if (asset.mime !== expectedMime) errors.push(`${label}.mime must be ${expectedMime}`);
  if (kind !== 'captions' && (!Number.isInteger(asset.width) || asset.width <= 0)) errors.push(`${label}.width must be positive`);
  if (kind !== 'captions' && (!Number.isInteger(asset.height) || asset.height <= 0)) errors.push(`${label}.height must be positive`);
  if (!Number.isInteger(asset.bytes) || asset.bytes <= 0) errors.push(`${label}.bytes must be positive`);
  if (!SHA256.test(asset.sha256 ?? '')) errors.push(`${label}.sha256 must be SHA-256`);
  if ((kind === 'hero' || kind === 'photo') && !nonEmpty(asset.alt)) errors.push(`${label}.alt must be readable`);
  if (kind !== 'captions' && !isRecord(asset.original)) {
    errors.push(`${label}.original metadata is required`);
  } else if (kind !== 'captions' && kind !== 'video') {
    if (!Number.isInteger(asset.original.width) || asset.original.width <= 0 || !Number.isInteger(asset.original.height) || asset.original.height <= 0) errors.push(`${label}.original dimensions must be positive`);
    if (!Number.isInteger(asset.original.bytes) || asset.original.bytes <= 0 || !SHA256.test(asset.original.sha256 ?? '')) errors.push(`${label}.original size and SHA-256 are required`);
    if (asset.width > 0 && asset.height > 0 && asset.original.width > 0 && asset.original.height > 0) {
      const sourceRatio = asset.original.width / asset.original.height;
      const outputRatio = asset.width / asset.height;
      if (Math.abs(sourceRatio - outputRatio) / sourceRatio > 0.01) errors.push(`${label} aspect ratio changed during processing`);
    }
  }
  if (options.verifyFiles && nonEmpty(asset.objectPath)) {
    const path = join(options.root, options.stagingDirectory, asset.objectPath);
    if (!existsSync(path)) errors.push(`${label} staged file does not exist: ${path}`);
    else {
      const bytes = statSync(path).size;
      const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
      if (bytes !== asset.bytes) errors.push(`${label}.bytes does not match staged file`);
      if (digest !== asset.sha256) errors.push(`${label}.sha256 does not match staged file`);
    }
    if (isRecord(asset.original) && nonEmpty(asset.sourcePath)) {
      const sourcePath = join(options.root, asset.sourcePath);
      if (!existsSync(sourcePath)) errors.push(`${label} original source does not exist`);
      else {
        const sourceBytes = statSync(sourcePath).size;
        const sourceDigest = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
        if (sourceBytes !== asset.original.bytes) errors.push(`${label}.original.bytes does not match source`);
        if (SHA256.test(asset.original.sha256 ?? '') && sourceDigest !== asset.original.sha256) errors.push(`${label}.original.sha256 does not match source`);
      }
    }
  }
}

export function validateMediaManifest(manifest, options = {}) {
  const settings = { verifyFiles: options.verifyFiles ?? true, root: options.root ?? process.cwd(), stagingDirectory: manifest?.stagingDirectory ?? '.media-staging' };
  const errors = [];
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || manifest.version !== 'v1') return ['manifest schemaVersion and version must be 1 and v1'];
  if (manifest.stagingDirectory !== '.media-staging') errors.push('manifest stagingDirectory must be .media-staging');
  if (!Array.isArray(manifest.sites)) return [...errors, 'manifest.sites must be an array'];
  const byId = new Map(manifest.sites.map((site) => [site?.id, site]));

  for (const siteId of REQUIRED_SITE_IDS) {
    const site = byId.get(siteId);
    if (!site) { errors.push(`site ${siteId} is missing`); continue; }
    if (!nonEmpty(site.officialName)) errors.push(`${siteId}.officialName is required`);
    if (!Array.isArray(site.photos) || site.photos.length !== EXPECTED_PHOTO_COUNTS[siteId]) errors.push(`${siteId} photo count must be ${EXPECTED_PHOTO_COUNTS[siteId]}`);
    else site.photos.forEach((item, index) => { if (item.sequence !== index + 1) errors.push(`${siteId}.photos sequence must remain fixed`); });
  }
  if (manifest.sites.some((site) => !REQUIRED_SITE_IDS.includes(site?.id))) errors.push('manifest contains an unexpected site ID');

  const allAssets = [];
  for (const siteId of REQUIRED_SITE_IDS) {
    const site = byId.get(siteId);
    if (!site) continue;
    allAssets.push([site.hero, `${siteId}.hero`, 'hero'], ...(site.photos ?? []).map((item, index) => [item, `${siteId}.photos[${index}]`, 'photo']), [site.video, `${siteId}.video`, 'video'], [site.poster, `${siteId}.poster`, 'poster'], [site.captions, `${siteId}.captions`, 'captions']);
  }
  for (const [asset, label] of allAssets) {
    if (!nonEmpty(asset?.objectPath) || !VERSIONED_PATH.test(asset.objectPath)) errors.push(`${label}.objectPath must be versioned`);
  }
  const paths = allAssets.map(([asset]) => asset?.objectPath).filter(Boolean);
  if (paths.length !== 60) errors.push(`manifest must contain 60 media objects, found ${paths.length}`);
  if (new Set(paths).size !== paths.length) errors.push('media object paths must be unique');

  for (const siteId of REQUIRED_SITE_IDS) {
    const video = byId.get(siteId)?.video;
    if (!video) continue;
    if (video.faststart !== true) errors.push(`${siteId}.video.faststart must be true`);
    if (video.codecs?.video !== 'h264') errors.push(`${siteId}.video must use H.264`);
    if (video.codecs?.audio !== 'aac') errors.push(`${siteId}.video must use AAC`);
    if (!Number.isFinite(video.durationSeconds) || video.durationSeconds <= 0) errors.push(`${siteId}.video.durationSeconds must be positive`);
    if (isRecord(video.original) && Number.isFinite(video.original.width) && Number.isFinite(video.original.height) && video.width > 0 && video.height > 0) {
      const sourceRatio = video.original.width / video.original.height;
      const outputRatio = video.width / video.height;
      if (Math.abs(sourceRatio - outputRatio) / sourceRatio > 0.01) errors.push(`${siteId}.video aspect ratio changed; crop, stretch, or wrong dimensions are forbidden`);
    }
    if (siteId === 'yangzhou-martyrs' && isRecord(video.original) && (video.bytes >= video.original.bytes || video.bytes > 35_000_000)) errors.push('yangzhou-martyrs video must be quality-controlled below source size and 35 MB');
  }
  for (const siteId of REQUIRED_SITE_IDS) checkAsset(byId.get(siteId)?.poster, `${siteId}.poster`, 'poster', errors, settings);
  for (const siteId of REQUIRED_SITE_IDS) checkAsset(byId.get(siteId)?.hero, `${siteId}.hero`, 'hero', errors, settings);
  for (const siteId of REQUIRED_SITE_IDS) (byId.get(siteId)?.photos ?? []).forEach((item, index) => checkAsset(item, `${siteId}.photos[${index}]`, 'photo', errors, settings));
  for (const siteId of REQUIRED_SITE_IDS) checkAsset(byId.get(siteId)?.video, `${siteId}.video`, 'video', errors, settings);
  for (const siteId of REQUIRED_SITE_IDS) checkAsset(byId.get(siteId)?.captions, `${siteId}.captions`, 'captions', errors, settings);

  for (const siteId of REQUIRED_SITE_IDS) {
    const poster = byId.get(siteId)?.poster;
    const expected = AI_WATERMARK_SITES.has(siteId);
    if (poster && poster.aiWatermarkPresent !== expected) errors.push(`${siteId}.poster.aiWatermarkPresent must disclose ${expected}`);
    if (expected && poster?.aiWatermarkAccepted !== true) errors.push(`${siteId}.poster.aiWatermarkAccepted must be true`);
  }
  return errors;
}

export function validateRightsDeclaration(rights) {
  const errors = [];
  if (!isRecord(rights) || rights.schemaVersion !== 1) return ['rights schemaVersion must be 1'];
  if (rights.declarationDate !== '2026-08-21') errors.push('rights.declarationDate must preserve the project decision date');
  if (rights.declaredBy !== '项目方') errors.push('rights.declaredBy must be 项目方');
  for (const field of ['photos', 'videos', 'embeddedMusic', 'captions', 'identifiablePeople']) if (rights.scope?.[field] !== true) errors.push(`rights.scope.${field} must be true`);
  if (rights.scope?.siteWideBackgroundMusicAdded !== false) errors.push('rights.scope.siteWideBackgroundMusicAdded must be false');
  if (!Array.isArray(rights.coveredSiteIds) || [...rights.coveredSiteIds].sort().join() !== [...REQUIRED_SITE_IDS].sort().join()) errors.push('rights.coveredSiteIds must contain exactly eight sites');
  const disclosures = new Map((rights.aiWatermarkPosters ?? []).map((item) => [item.siteId, item]));
  for (const siteId of AI_WATERMARK_SITES) {
    const disclosure = disclosures.get(siteId);
    if (disclosure?.aiWatermarkPresent !== true) errors.push(`${siteId}.aiWatermarkPresent must be true`);
    if (disclosure?.aiWatermarkAccepted !== true) errors.push(`${siteId}.aiWatermarkAccepted must be true`);
    if (disclosure?.acceptedBy !== '项目方' || disclosure?.acceptedAt !== '2026-08-21') errors.push(`${siteId} watermark acceptance must be traceable`);
  }
  return errors;
}

function timestamp(value) {
  const match = /^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(value);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function parseWebVtt(input) {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const errors = [];
  const cues = [];
  if (!text.startsWith('WEBVTT\n')) errors.push('WebVTT must start with WEBVTT');
  const blocks = text.split(/\n{2,}/).slice(text.startsWith('WEBVTT') ? 1 : 0);
  for (const [index, block] of blocks.entries()) {
    if (!block.trim() || block.startsWith('NOTE')) continue;
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) { errors.push(`cue ${index + 1} has no timing`); continue; }
    const [startText, endPart] = lines[timingIndex].split('-->').map((part) => part.trim());
    const endText = endPart?.split(/\s+/)[0];
    const start = timestamp(startText);
    const end = timestamp(endText);
    const cueText = lines.slice(timingIndex + 1).join('\n').trim();
    if (start === null || end === null) errors.push(`cue ${index + 1} has invalid time`);
    if (start !== null && end !== null && end <= start) errors.push(`cue ${index + 1} end must be after start`);
    if (!cueText) errors.push(`cue ${index + 1} has empty text`);
    if (start !== null && cues.length && start < cues.at(-1).end) errors.push(`cue ${index + 1} overlaps the previous cue`);
    if (start !== null && end !== null) cues.push({ start, end, text: cueText });
  }
  if (cues.length === 0) errors.push('WebVTT must contain at least one cue');
  return { errors, cues };
}

export function checkMedia(root = process.cwd()) {
  const errors = [];
  let manifest;
  let rights;
  try { manifest = JSON.parse(readFileSync(join(root, 'content/media/media-manifest.json'), 'utf8')); } catch (error) { errors.push(`media-manifest.json is unreadable: ${error.message}`); }
  try { rights = JSON.parse(readFileSync(join(root, 'content/media/media-rights-declaration.json'), 'utf8')); } catch (error) { errors.push(`media-rights-declaration.json is unreadable: ${error.message}`); }
  if (manifest) errors.push(...validateMediaManifest(manifest, { root, verifyFiles: true }));
  if (rights) errors.push(...validateRightsDeclaration(rights));
  let captionFiles = [];
  try { captionFiles = readdirSync(join(root, 'content/media/captions')).filter((file) => file.endsWith('.vtt')).sort(); } catch { errors.push('content/media/captions is missing'); }
  const expectedFiles = REQUIRED_SITE_IDS.map((id) => `${id}.vtt`).sort();
  if (captionFiles.join() !== expectedFiles.join()) errors.push('captions directory must contain exactly eight site VTT files');
  for (const file of captionFiles) {
    const bytes = readFileSync(join(root, 'content/media/captions', file));
    const text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) errors.push(`${file} is not valid UTF-8`);
    errors.push(...parseWebVtt(text).errors.map((error) => `${file}: ${error}`));
  }
  return errors;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const root = resolve(dirname(modulePath), '..');
  const errors = checkMedia(root);
  if (errors.length) {
    console.error(`Media check failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else console.log('Media check passed: 28 photos and 8 complete hero/video/poster/VTT sets (60 staged objects).');
}
