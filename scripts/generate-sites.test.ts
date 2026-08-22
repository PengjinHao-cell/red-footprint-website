import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  generateSites,
  resolveReconciledDelivery,
} from './generate-sites.mjs';
import { buildObjectReleaseManifest } from './check-upload-reconciliation.mjs';

const temporaryDirectories: string[] = [];
const expectedSites = [
  ['sihong-memorial', '淮北抗日民主根据地纪念馆'],
  ['yuhuatai-martyrs', '雨花台烈士陵园'],
  ['dujiang-victory', '渡江胜利纪念馆'],
  ['sihang-warehouse', '上海四行仓库抗战纪念馆'],
  ['cpc-first-congress', '中国共产党第一次全国代表大会纪念馆'],
  ['jiangshangqing-memorial', '江上青烈士史料陈列馆'],
  ['yangzhou-martyrs', '扬州革命烈士陵园'],
  ['meiyuan-new-village', '中国共产党代表团梅园新村纪念馆'],
] as const;
const expectedPhotoCounts = [2, 5, 5, 5, 5, 1, 1, 4];

type GeneratedResource = {
  deliveryStatus: string;
  objectPath: string;
  productionUrl: string | null;
  sha256: string;
  url: string;
  version: string;
};

type GeneratedSite = {
  contentReview: { localMaterialSources: unknown[] };
  heroAsset: GeneratedResource;
  id: string;
  media: Array<{ type: string }>;
  mediaDelivery: Record<string, unknown>;
  photos: Array<{ asset: GeneratedResource }>;
  sources: Array<{ sourceType: string }>;
  video: {
    asset: GeneratedResource;
    captionsAsset: GeneratedResource;
    posterAsset: GeneratedResource;
  };
};

function generateToTemporaryFile() {
  const directory = mkdtempSync(join(tmpdir(), 'generate-sites-'));
  temporaryDirectories.push(directory);
  const outputPath = join(directory, 'sites.json');
  const result = spawnSync(
    'node',
    ['scripts/generate-sites.mjs', '--output', outputPath],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  return { outputPath, result };
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

describe('generate-sites', () => {
  it('deterministically generates the eight reviewed sites in manifest order', () => {
    const first = generateToTemporaryFile();
    const second = generateToTemporaryFile();

    expect(first.result.status, first.result.stderr).toBe(0);
    expect(second.result.status, second.result.stderr).toBe(0);
    expect(existsSync(first.outputPath)).toBe(true);
    expect(readFileSync(first.outputPath)).toEqual(readFileSync(second.outputPath));

    const sites = JSON.parse(readFileSync(first.outputPath, 'utf8'));
    expect(sites.map(({ id, officialName }: Record<string, string>) => [id, officialName])).toEqual(
      expectedSites,
    );
    expect(sites.map(({ photos }: { photos: unknown[] }) => photos.length)).toEqual(
      expectedPhotoCounts,
    );
  });

  it('preserves reviewed facts, local-document provenance, and the dual first-congress addresses', () => {
    const { outputPath, result } = generateToTemporaryFile();
    expect(result.status, result.stderr).toBe(0);
    if (result.status !== 0) return;

    const sites = JSON.parse(readFileSync(outputPath, 'utf8'));
    const firstCongress = sites.find(
      ({ id }: { id: string }) => id === 'cpc-first-congress',
    );
    expect(firstCongress).toMatchObject({
      coordinateSystem: 'GCJ-02',
      markerAddress: '上海市黄浦区兴业路76号',
      address: '上海市黄浦区黄陂南路374号',
    });

    const dujiang = sites.find(
      ({ id }: { id: string }) => id === 'dujiang-victory',
    );
    expect(dujiang.contentReview.localMaterialSources).toContainEqual({
      sourceType: 'local-document',
      documentPath: 'Videos/渡江胜利纪念馆/正文文案.doc',
      supports: ['opening', 'reservation', 'visitNotice'],
      note: '采用文档中的开放时段、实名线上免费预约和文明参观提示。',
    });
    expect(dujiang.sources.every(({ sourceType }: { sourceType: string }) => sourceType === 'authoritative-web')).toBe(true);
    expect(JSON.stringify(sites)).not.toContain('本地材料补充');
  });

  it('emits a video-first sequence and traceable pre-upload media resources', () => {
    const sites = generateSites(process.cwd(), { delivery: null });
    sites.forEach((site: GeneratedSite) => {
      expect(site.media[0].type).toBe('video');
      expect(site.mediaDelivery).toEqual({
        status: 'pre-upload-object',
        version: 'v1',
        productionBaseUrl: null,
      });
      const resources = [
        site.heroAsset,
        ...site.photos.map(({ asset }) => asset),
        site.video.asset,
        site.video.posterAsset,
        site.video.captionsAsset,
      ];
      resources.forEach((resource) => {
        expect(resource).toMatchObject({
          deliveryStatus: 'pre-upload-object',
          version: 'v1',
          productionUrl: null,
        });
        expect(resource.objectPath).toMatch(
          new RegExp(`^media/sites/${site.id}/v1/`),
        );
        expect(resource.url).toBe(`/${resource.objectPath}`);
        expect(resource.sha256).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });
});

describe('reconciliation-driven media delivery', () => {
  const environmentId = 'red-footprint-preview-d5322636bd';
  const bucket = '7265-red-footprint-preview-d5322636bd-1438111688';
  const cdnBaseUrl = `https://${bucket}.tcb.qcloud.la`;

  function inputs() {
    const manifest = JSON.parse(
      readFileSync('content/media/media-manifest.json', 'utf8'),
    );
    const release = buildObjectReleaseManifest(manifest, {
      environmentId,
      bucket,
      region: 'ap-shanghai',
      releasedAt: '2026-08-22T12:00:00+08:00',
    });
    const reconciliation = {
      schemaVersion: 1,
      environmentId,
      region: 'ap-shanghai',
      bucket,
      version: 'v1',
      cdnBaseUrl,
      verifiedAt: '2026-08-22T12:30:00+08:00',
      objectCount: release.objectCount,
      totalBytes: release.totalBytes,
      operations: {
        created: 60,
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
          httpsUrl: `${cdnBaseUrl}/${objectPath}`,
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
    return { manifest, release, reconciliation };
  }

  it('keeps pre-upload delivery when reconciliation is absent', () => {
    const { manifest, release } = inputs();
    expect(resolveReconciledDelivery(manifest, release, null)).toBeNull();
  });

  it('uses reconciled production URLs only for a complete valid reconciliation', () => {
    const { manifest, release, reconciliation } = inputs();
    const delivery = resolveReconciledDelivery(
      manifest,
      release,
      reconciliation,
    );

    expect(delivery?.productionBaseUrl).toBe(cdnBaseUrl);
    expect(delivery?.objects.size).toBe(60);
    expect(delivery?.objects.get(release.objects[0].objectPath)).toBe(
      `${cdnBaseUrl}/${release.objects[0].objectPath}`,
    );
    const sites = generateSites(process.cwd(), { delivery });
    expect(sites.every((site) => site.mediaDelivery.status === 'reconciled-production')).toBe(true);
    expect(sites.every((site) => site.heroAsset.url.startsWith(cdnBaseUrl))).toBe(true);
  });

  it.each([
    ['missing object', (value: ReturnType<typeof inputs>) => value.reconciliation.objects.pop()],
    ['digest mismatch', (value: ReturnType<typeof inputs>) => { value.reconciliation.objects[0].sha256 = 'f'.repeat(64); }],
    ['non-HTTPS URL', (value: ReturnType<typeof inputs>) => { value.reconciliation.objects[0].httpsUrl = value.reconciliation.objects[0].httpsUrl.replace('https://', 'http://'); }],
    ['placeholder domain', (value: ReturnType<typeof inputs>) => {
      value.reconciliation.cdnBaseUrl = 'https://media.example.test';
      value.reconciliation.objects = value.reconciliation.objects.map((object) => ({
        ...object,
        httpsUrl: object.httpsUrl.replace(cdnBaseUrl, value.reconciliation.cdnBaseUrl),
      }));
    }],
  ])('falls back to pre-upload delivery for %s', (_label, mutate) => {
    const value = inputs();
    mutate(value);
    expect(
      resolveReconciledDelivery(
        value.manifest,
        value.release,
        value.reconciliation,
      ),
    ).toBeNull();
  });
});
