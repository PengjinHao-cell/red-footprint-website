import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
    const { outputPath, result } = generateToTemporaryFile();
    expect(result.status, result.stderr).toBe(0);
    if (result.status !== 0) return;

    const sites = JSON.parse(readFileSync(outputPath, 'utf8'));
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
