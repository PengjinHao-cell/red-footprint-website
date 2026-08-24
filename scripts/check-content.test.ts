import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runContentCheck, validateContent } from './check-content.mjs';
import { buildObjectReleaseManifest } from './check-upload-reconciliation.mjs';

const temporaryDirectories: string[] = [];
const productionSitesPath = join(process.cwd(), 'src/data/sites.json');
const MEDIA_CHECK_MODE_ENV = 'RED_FOOTPRINT_MEDIA_CHECK_MODE';
const ENVIRONMENT_ID = 'red-footprint-preview-d5322636bd';
const BUCKET = '7265-red-footprint-preview-d5322636bd-1438111688';
const CDN_BASE_URL = `https://${BUCKET}.tcb.qcloud.la`;

function readProductionSites() {
  expect(existsSync(productionSitesPath)).toBe(true);
  if (!existsSync(productionSitesPath)) return [];
  return JSON.parse(readFileSync(productionSitesPath, 'utf8'));
}

function createCommittedProjectRoot() {
  const root = mkdtempSync(join(tmpdir(), 'committed-project-'));
  temporaryDirectories.push(root);
  cpSync(join(process.cwd(), 'content'), join(root, 'content'), {
    recursive: true,
  });
  cpSync(join(process.cwd(), 'src'), join(root, 'src'), { recursive: true });
  return root;
}

/** 构造一份与当前 77 对象 manifest 完全一致的合成对账,供 release 模式测试使用。 */
function createReconciledProjectRoot() {
  const root = createCommittedProjectRoot();
  const manifest = JSON.parse(
    readFileSync(join(root, 'content/media/media-manifest.json'), 'utf8'),
  );
  const release = buildObjectReleaseManifest(manifest, {
    environmentId: ENVIRONMENT_ID,
    bucket: BUCKET,
    region: 'ap-shanghai',
    releasedAt: '2026-08-22T12:00:00+08:00',
  });
  const reconciliation = {
    schemaVersion: 1,
    environmentId: ENVIRONMENT_ID,
    region: 'ap-shanghai',
    bucket: BUCKET,
    version: 'v1',
    cdnBaseUrl: CDN_BASE_URL,
    verifiedAt: '2026-08-22T12:30:00+08:00',
    objectCount: release.objectCount,
    totalBytes: release.totalBytes,
    operations: {
      created: release.objectCount,
      overwritten: 0,
      deleted: 0,
      permissionsModified: false,
    },
    objects: release.objects.map((object: Record<string, unknown>) => {
      const objectPath = object.objectPath as string;
      const bytes = object.bytes as number;
      const mime = object.mime as string;
      const sha256 = object.sha256 as string;
      return {
        objectPath,
        bytes,
        mime,
        sha256,
        httpsUrl: `${CDN_BASE_URL}/${objectPath}`,
        cloud: { exists: true, bytes, mime },
        http: {
          status: 200,
          bytes,
          mime,
          sha256,
          ...(mime === 'video/mp4'
            ? {
                range: {
                  request: 'bytes=0-1023',
                  status: 206,
                  contentRange: `bytes 0-1023/${bytes}`,
                },
              }
            : {}),
          ...(mime.startsWith('text/vtt') ? { webVtt: true } : {}),
          ...(mime === 'image/webp' ? { webpSignature: true } : {}),
        },
      };
    }),
  };
  writeFileSync(
    join(root, 'content/cloudbase/upload-reconciliation.json'),
    `${JSON.stringify(reconciliation, null, 2)}\n`,
  );
  // 将复制的 pre-upload sites.json 转为 reconciled 版本
  const sitesPath = join(root, 'src/data/sites.json');
  const sites = JSON.parse(readFileSync(sitesPath, 'utf8'));
  const urlByPath = new Map(
    reconciliation.objects.map((object: Record<string, string>) => [
      object.objectPath,
      object.httpsUrl,
    ]),
  );
  for (const site of sites) {
    site.mediaDelivery = {
      status: 'reconciled-production',
      version: 'v1',
      productionBaseUrl: CDN_BASE_URL,
    };
    const resources = [
      site.heroAsset,
      ...(site.photos ?? []).map((photo: { asset: Record<string, unknown> }) => photo.asset),
      site.video?.asset,
      site.video?.posterAsset,
      site.video?.captionsAsset,
    ];
    for (const resource of resources) {
      if (!resource) continue;
      resource.deliveryStatus = 'reconciled-production';
      resource.url = urlByPath.get(resource.objectPath as string);
      resource.productionUrl = urlByPath.get(resource.objectPath as string);
    }
    site.heroImage = site.heroAsset.url;
    (site.photos ?? []).forEach(
      (photo: { src: string; asset: { url: string } }) => {
        photo.src = photo.asset.url;
      },
    );
    if (site.video) {
      site.video.url = site.video.asset.url;
      site.video.poster = site.video.posterAsset.url;
      site.video.captions = site.video.captionsAsset.url;
    }
    site.media = [
      {
        type: 'video',
        src: site.video?.url,
        poster: site.video?.poster,
        captions: site.video?.captions,
      },
      ...(site.photos ?? []).map(
        (photo: { src: string; alt?: string }) => ({
          type: 'image',
          src: photo.src,
          ...(photo.alt ? { alt: photo.alt } : {}),
        }),
      ),
    ];
  }
  writeFileSync(sitesPath, `${JSON.stringify(sites, null, 2)}\n`);
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

describe('content production gate', () => {
  it('chains Task 3, Task 4, schema, deterministic generation, and drift checks in local mode', () => {
    const result = spawnSync('npm', ['run', 'check:content'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status, output).toBe(0);
    expect(output).toMatch(/Task 3 production content.*passed/i);
    expect(output).toMatch(/Task 4 media.*passed/i);
    expect(output).toMatch(/production schema.*passed/i);
    expect(output).toMatch(/fixture.*placeholder.*manual drift.*absent/i);
  });

  it('accepts the generated production schema with explicit pre-upload resources', () => {
    const sites = readProductionSites();

    expect(validateContent(sites, { root: process.cwd() })).toEqual([]);
    expect(sites).toHaveLength(8);
  });

  it('rejects a placeholder production URL even before Task 6 reconciliation', () => {
    const sites = structuredClone(readProductionSites());
    if (sites.length === 0) return;
    sites[0].heroAsset.deliveryStatus = 'reconciled-production';
    sites[0].heroAsset.productionUrl = 'https://media.example.test/hero.webp';
    sites[0].heroAsset.url = sites[0].heroAsset.productionUrl;

    expect(validateContent(sites, { root: process.cwd() }).join('\n')).toMatch(
      /placeholder|test domain/i,
    );
  });

  it('rejects release build-input drift against the committed manifest', () => {
    const sites = readProductionSites();
    if (sites.length === 0) return;
    const directory = mkdtempSync(join(tmpdir(), 'content-drift-'));
    temporaryDirectories.push(directory);
    const sitesPath = join(directory, 'sites.json');
    sites[0].heroAsset.sha256 = 'f'.repeat(64);
    writeFileSync(sitesPath, `${JSON.stringify(sites, null, 2)}\n`);

    const result = spawnSync(
      'node',
      ['scripts/check-content.mjs', '--release', '--sites', sitesPath],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toMatch(/match media manifest|digestRef/i);
  });

  it('passes explicit release mode in a fully reconciled project export', () => {
    const root = createReconciledProjectRoot();

    expect(runContentCheck(['--release'], root)).toBe(0);
  });

  it('does not silently relax the default local gate in a clean export', () => {
    const root = createCommittedProjectRoot();

    withMediaCheckMode(undefined, () => {
      expect(runContentCheck([], root)).toBe(1);
    });
  });

  it('passes a clean export when CI explicitly selects release mode', () => {
    const root = createReconciledProjectRoot();

    withMediaCheckMode('release', () => {
      expect(runContentCheck([], root)).toBe(0);
    });
  });

  it('rejects non-HTTPS production media in release mode', () => {
    const root = createReconciledProjectRoot();
    const sitesPath = join(root, 'src/data/sites.json');
    const sites = JSON.parse(readFileSync(sitesPath, 'utf8'));
    sites[0].heroAsset.productionUrl = sites[0].heroAsset.productionUrl.replace(
      'https://',
      'http://',
    );
    sites[0].heroAsset.url = sites[0].heroAsset.productionUrl;
    writeFileSync(sitesPath, `${JSON.stringify(sites, null, 2)}\n`);

    expect(runContentCheck(['--release'], root)).toBe(1);
  });
});
