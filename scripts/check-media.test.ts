import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  EXPECTED_PHOTO_COUNTS,
  REQUIRED_SITE_IDS,
  checkMedia,
  parseWebVtt,
  validateMediaManifest,
  validateRightsDeclaration,
} from './check-media.mjs';

const temporaryDirectories: string[] = [];
const MEDIA_CHECK_MODE_ENV = 'RED_FOOTPRINT_MEDIA_CHECK_MODE';

function createCommittedMediaRoot() {
  const root = mkdtempSync(join(tmpdir(), 'committed-media-'));
  temporaryDirectories.push(root);
  cpSync(
    join(process.cwd(), 'content/media'),
    join(root, 'content/media'),
    { recursive: true },
  );
  return root;
}

function withMediaCheckMode<T>(mode: string | undefined, callback: () => T) {
  const previous = process.env[MEDIA_CHECK_MODE_ENV];
  if (mode === undefined) delete process.env[MEDIA_CHECK_MODE_ENV];
  else process.env[MEDIA_CHECK_MODE_ENV] = mode;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env[MEDIA_CHECK_MODE_ENV];
    else process.env[MEDIA_CHECK_MODE_ENV] = previous;
  }
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

function asset(kind: string, siteId: string, sequence = 1) {
  const extension = kind === 'video' ? 'mp4' : kind === 'captions' ? 'vtt' : 'webp';
  const directory = kind === 'photo' ? 'photos' : kind;
  return {
    sourcePath: `Videos/${siteId}/${kind}-${sequence}.source`,
    objectPath: `media/sites/${siteId}/v1/${directory}/${siteId}-${kind}-${sequence}.${extension}`,
    mime: kind === 'video' ? 'video/mp4' : kind === 'captions' ? 'text/vtt; charset=utf-8' : 'image/webp',
    width: kind === 'captions' ? null : 720,
    height: kind === 'captions' ? null : 1280,
    bytes: 1234,
    sha256: 'a'.repeat(64),
    ...(kind === 'captions'
      ? {}
      : { original: { width: 1080, height: 1920, bytes: 4567, sha256: 'b'.repeat(64) } }),
  };
}

function completeManifest() {
  return {
    schemaVersion: 1,
    version: 'v1',
    stagingDirectory: '.media-staging',
    sites: REQUIRED_SITE_IDS.map((siteId) => ({
      id: siteId,
      officialName: `场馆 ${siteId}`,
      hero: { ...asset('hero', siteId), alt: '可读的场馆头图替代文本' },
      photos: Array.from({ length: EXPECTED_PHOTO_COUNTS[siteId] }, (_, index) => ({
        ...asset('photo', siteId, index + 1),
        alt: `可读的场馆照片替代文本 ${index + 1}`,
        sequence: index + 1,
      })),
      video: {
        ...asset('video', siteId),
        durationSeconds: 60,
        codecs: { video: 'h264', audio: 'aac' },
        faststart: true,
        original: {
          codecVideo: 'h264',
          codecAudio: 'aac',
          width: 1080,
          height: 1920,
          durationSeconds: 60,
          bytes: 4567,
        },
      },
      poster: {
        ...asset('poster', siteId),
        aiWatermarkPresent: ['yuhuatai-martyrs', 'jiangshangqing-memorial', 'yangzhou-martyrs'].includes(siteId),
        aiWatermarkAccepted: ['yuhuatai-martyrs', 'jiangshangqing-memorial', 'yangzhou-martyrs'].includes(siteId),
      },
      captions: { ...asset('captions', siteId), width: undefined, height: undefined },
    })),
  };
}

function completeRights() {
  return {
    schemaVersion: 1,
    declarationDate: '2026-08-21',
    declaredBy: '项目方',
    scope: {
      photos: true,
      videos: true,
      embeddedMusic: true,
      captions: true,
      identifiablePeople: true,
      siteWideBackgroundMusicAdded: false,
    },
    coveredSiteIds: [...REQUIRED_SITE_IDS],
    aiWatermarkPosters: ['yuhuatai-martyrs', 'jiangshangqing-memorial', 'yangzhou-martyrs'].map((siteId) => ({
      siteId,
      aiWatermarkPresent: true,
      aiWatermarkAccepted: true,
      acceptedBy: '项目方',
      acceptedAt: '2026-08-21',
    })),
  };
}

describe('media manifest validation', () => {
  it('accepts eight sites, 45 ordered photos, and 77 versioned objects', () => {
    expect(validateMediaManifest(completeManifest(), { verifyFiles: false })).toEqual([]);
  });

  it('rejects changed photo counts, unversioned paths, and non-web video codecs', () => {
    const manifest = completeManifest();
    manifest.sites[0].photos.pop();
    manifest.sites[1].hero.objectPath = 'media/latest/hero.webp';
    manifest.sites[2].video.codecs.video = 'hevc';
    expect(validateMediaManifest(manifest, { verifyFiles: false }).join('\n')).toMatch(
      /photo count[\s\S]*versioned[\s\S]*H\.264/i,
    );
  });

  it('requires faststart, positive dimensions, sizes, and SHA-256 values', () => {
    const manifest = completeManifest();
    manifest.sites[0].video.faststart = false;
    manifest.sites[0].poster.width = 0;
    manifest.sites[0].hero.bytes = 0;
    manifest.sites[0].photos[0].sha256 = 'not-a-digest';
    expect(validateMediaManifest(manifest, { verifyFiles: false }).join('\n')).toMatch(
      /faststart[\s\S]*width[\s\S]*bytes[\s\S]*SHA-256/i,
    );
  });

  it('rejects an image whose processed dimensions change the original aspect ratio', () => {
    const manifest = completeManifest();
    manifest.sites[0].hero.width = 1000;
    expect(validateMediaManifest(manifest, { verifyFiles: false }).join('\n')).toMatch(
      /hero.*aspect ratio/i,
    );
  });

  it('requires the complete project-party usage and portrait declaration', () => {
    expect(validateRightsDeclaration(completeRights())).toEqual([]);
    const rights = completeRights();
    rights.scope.identifiablePeople = false;
    rights.aiWatermarkPosters[0].aiWatermarkAccepted = false;
    expect(validateRightsDeclaration(rights).join('\n')).toMatch(/identifiablePeople[\s\S]*aiWatermarkAccepted/);
  });
});

describe('media gate modes', () => {
  it('accepts a clean committed-media export only in explicit release mode', () => {
    const root = createCommittedMediaRoot();

    expect(checkMedia(root, { mode: 'release' })).toEqual([]);
  });

  it('keeps the default local mode strict when raw and staging files are absent', () => {
    const root = createCommittedMediaRoot();

    withMediaCheckMode(undefined, () => {
      expect(checkMedia(root).join('\n')).toMatch(/staged file does not exist|original source does not exist/i);
    });
  });

  it('accepts a clean export when release mode is explicitly passed by CI', () => {
    const root = createCommittedMediaRoot();

    withMediaCheckMode('release', () => {
      expect(checkMedia(root)).toEqual([]);
    });
  });

  it('rejects manifest digest, rights, and committed-caption failures in release mode', () => {
    const root = createCommittedMediaRoot();
    const manifestPath = join(root, 'content/media/media-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.sites[0].hero.sha256 = 'not-a-sha256-digest';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    unlinkSync(join(root, 'content/media/media-rights-declaration.json'));
    unlinkSync(join(root, 'content/media/captions', `${REQUIRED_SITE_IDS[0]}.vtt`));

    const errors = checkMedia(root, { mode: 'release' }).join('\n');
    expect(errors).toMatch(/sha-256/i);
    expect(errors).toMatch(/rights-declaration.*unreadable/i);
    expect(errors).toMatch(/exactly eight site VTT files/i);
  });

  it('rejects an invalid committed WebVTT file in release mode', () => {
    const root = createCommittedMediaRoot();
    writeFileSync(
      join(root, 'content/media/captions', `${REQUIRED_SITE_IDS[0]}.vtt`),
      'not a WebVTT file\n',
    );

    expect(checkMedia(root, { mode: 'release' }).join('\n')).toMatch(/WEBVTT/i);
  });
});

describe('WebVTT validation', () => {
  it('parses non-overlapping UTF-8 cues', () => {
    const result = parseWebVtt('WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n第一句\n\n00:00:02.200 --> 00:00:04.000\n第二句\n');
    expect(result.errors).toEqual([]);
    expect(result.cues).toHaveLength(2);
  });

  it('rejects overlap, reversed time, empty text, and a missing WEBVTT header', () => {
    const result = parseWebVtt('00:00:01.000 --> 00:00:03.000\n\n00:00:02.000 --> 00:00:01.000\n错误\n');
    expect(result.errors.join('\n')).toMatch(/WEBVTT[\s\S]*empty[\s\S]*(?:overlap|after start)/i);
  });

  it('ships exactly eight UTF-8 caption files with the approved site IDs', () => {
    const files = readdirSync('content/media/captions').sort();
    expect(files).toEqual(REQUIRED_SITE_IDS.map((siteId) => `${siteId}.vtt`).sort());
    for (const file of files) {
      const bytes = readFileSync(`content/media/captions/${file}`);
      const text = bytes.toString('utf8');
      expect(Buffer.from(text, 'utf8')).toEqual(bytes);
      expect(parseWebVtt(text).errors).toEqual([]);
    }
  });
});
