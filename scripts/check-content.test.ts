import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateContent } from './check-content.mjs';

const officialNames = [
  '淮北抗日民主根据地纪念馆',
  '雨花台烈士陵园',
  '渡江胜利纪念馆',
  '上海四行仓库抗战纪念馆',
  '中国共产党第一次全国代表大会纪念馆',
  '江上青烈士史料陈列馆',
  '扬州革命烈士陵园',
  '中国共产党代表团梅园新村纪念馆',
] as const;

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
] as const;

const temporaryDirectories: string[] = [];

function createTemporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), 'content-compliance-fixture-'));
  temporaryDirectories.push(root);
  return root;
}

function writeAsset(root: string, relativePath: string, contents = 'asset') {
  const assetPath = join(root, relativePath);
  mkdirSync(dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, contents);
}

function createSyntheticEightSites(root: string) {
  return officialNames.map((officialName, index) => {
    const sequence = String(index + 1).padStart(2, '0');
    const assetDirectory = `assets/site-${sequence}`;
    const heroImage = `${assetDirectory}/hero.webp`;
    const photo = `${assetDirectory}/photo-01.webp`;
    const poster = `${assetDirectory}/poster.webp`;
    const captions = `${assetDirectory}/captions.vtt`;

    writeAsset(root, heroImage);
    writeAsset(root, photo);
    writeAsset(root, poster);
    writeAsset(
      root,
      captions,
      'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n字幕校验文本\n',
    );

    return {
      id: `site-${sequence}`,
      officialName,
      shortName: `场馆简称${sequence}`,
      province: index === 3 || index === 4 ? '上海市' : '江苏省',
      city: `核验城市${sequence}`,
      district: `核验区县${sequence}`,
      address: `经来源核验的完整地址${sequence}`,
      coordinates: { lat: 31 + index / 100, lng: 118 + index / 100 },
      opening: `经核验的开放信息${sequence}`,
      reservation: `经核验的预约规则${sequence}`,
      visitNotice: `经核验的参观提示${sequence}`,
      officialTitle: `经核验的官方称号${sequence}`,
      history: `已完成来源对照的历史模块文本${sequence}，本段仅用于门禁自动化测试。`,
      people: `已完成来源对照的人物模块文本${sequence}，本段仅用于门禁自动化测试。`,
      spirit: `已完成来源对照的精神模块文本${sequence}，本段仅用于门禁自动化测试。`,
      reflection: `已完成内容审核的寻访感悟${sequence}，本段仅用于门禁自动化测试。`,
      heroImage,
      heroFocus: { x: 50, y: 50 },
      photos: [
        {
          src: photo,
          alt: `场馆入口与展陈环境的可见画面描述${sequence}`,
        },
      ],
      video: {
        url: `https://media.cctv.com/releases/site-${sequence}.mp4`,
        poster,
        captions,
        posterReview: {
          status: 'verified',
          aiWatermark: false,
          reviewedAt: '2026-08-21',
          reviewedBy: '封面审核员',
        },
      },
      sources: [
        {
          label: `权威资料${sequence}`,
          publisher: '政府部门或场馆官方机构',
          url: `https://www.gov.cn/zhengce/ziliao/site-${sequence}`,
          authoritative: true,
          supports: [...factModules],
        },
      ],
      contentReview: {
        status: 'verified',
        reviewedAt: '2026-08-21',
        reviewedBy: '内容审核员',
      },
    };
  });
}

function errorsFor(sites: unknown, root: string) {
  return validateContent(sites, { root }).join('\n');
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

describe('validateContent', () => {
  it('accepts a complete synthetic eight-site fixture with local assets', () => {
    const root = createTemporaryRoot();

    expect(validateContent(createSyntheticEightSites(root), { root })).toEqual([]);
  });

  it('rejects fewer than eight sites', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root).slice(0, 7);

    expect(errorsFor(sites, root)).toMatch(/exactly 8 sites/i);
  });

  it('reports the missing eighth official site even when eight records remain', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[7].officialName = sites[0].officialName;

    expect(errorsFor(sites, root)).toContain(officialNames[7]);
  });

  it('rejects an unconfirmed or shortened official name', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[3].officialName = '四行仓库';

    expect(errorsFor(sites, root)).toMatch(/officialName.*四行仓库/);
  });

  it('rejects duplicate IDs', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[1].id = sites[0].id;

    expect(errorsFor(sites, root)).toMatch(/id.*unique/i);
  });

  it('rejects a site with no selected photos', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].photos = [];

    expect(errorsFor(sites, root)).toMatch(/sites\[0\]\.photos.*1.*5/);
  });

  it('rejects a site with six selected photos', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    const photo = sites[0].photos[0];
    sites[0].photos = Array.from({ length: 6 }, (_, index) => ({
      ...photo,
      alt: `${photo.alt}-${index + 1}`,
    }));

    expect(errorsFor(sites, root)).toMatch(/sites\[0\]\.photos.*1.*5/);
  });

  it('rejects a photo without reviewable alt text', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].photos[0].alt = '照片1';

    expect(errorsFor(sites, root)).toMatch(/photos\[0\]\.alt/);
  });

  it('rejects a missing caption resource', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.captions = '';

    expect(errorsFor(sites, root)).toMatch(/video\.captions/);
  });

  it('rejects a missing hero resource', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].heroImage = '';

    expect(errorsFor(sites, root)).toMatch(/heroImage/);
  });

  it('rejects a missing video poster resource', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.poster = '';

    expect(errorsFor(sites, root)).toMatch(/video\.poster/);
  });

  it('rejects a non-HTTPS video URL', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.url = 'http://media.cctv.com/releases/site-01.mp4';

    expect(errorsFor(sites, root)).toMatch(/video\.url.*HTTPS/i);
  });

  it('rejects zero videos', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    delete (sites[0] as Partial<(typeof sites)[number]>).video;

    expect(errorsFor(sites, root)).toMatch(/video.*exactly one/i);
  });

  it('rejects multiple videos', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    const video = sites[0].video;
    (sites[0] as unknown as { video: unknown }).video = [video, video];

    expect(errorsFor(sites, root)).toMatch(/video.*exactly one/i);
  });

  it('rejects a production media override that puts an image before video', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    (sites[0] as unknown as { media: unknown }).media = [
      { type: 'image', src: sites[0].photos[0].src },
      { type: 'video', src: sites[0].video.url },
    ];

    expect(errorsFor(sites, root)).toMatch(/media.*video first/i);
  });

  it('rejects test or placeholder URLs', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.url = 'https://media.example.test/video.mp4';

    expect(errorsFor(sites, root)).toMatch(/video\.url.*placeholder/i);
  });

  it('rejects a missing authoritative source for one fact module', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].sources[0].supports = factModules.filter((field) => field !== 'people');

    expect(errorsFor(sites, root)).toMatch(/facts\.people.*authoritative source/i);
  });

  it('rejects content whose authoritative review is not verified', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].contentReview.status = 'blocked';

    expect(errorsFor(sites, root)).toMatch(/contentReview\.status.*verified/i);
  });

  it('rejects an AI-watermarked poster review', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.posterReview.aiWatermark = true;

    expect(errorsFor(sites, root)).toMatch(/posterReview\.aiWatermark/);
  });

  it('rejects a referenced local asset that is absent', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].heroImage = 'assets/site-01/not-present.webp';

    expect(errorsFor(sites, root)).toMatch(/heroImage.*does not exist/i);
  });
});

describe('content compliance command', () => {
  it('fails closed when the production sites file is missing', () => {
    const result = spawnSync('npm', ['run', 'check:content'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/sites\.json.*(?:missing|not found)/i);
  });

  it('accepts only the temporary synthetic complete fixture', () => {
    const root = createTemporaryRoot();
    const sitesPath = join(root, 'sites.json');
    writeFileSync(sitesPath, JSON.stringify(createSyntheticEightSites(root)));

    const result = spawnSync(
      'node',
      ['scripts/check-content.mjs', '--sites', sitesPath, '--root', root],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/passed/i);
  });

  it('reports the exact video field for an invalid fixture', () => {
    const root = createTemporaryRoot();
    const sites = createSyntheticEightSites(root);
    sites[0].video.url = 'http://media.cctv.com/releases/site-01.mp4';
    const sitesPath = join(root, 'sites.json');
    writeFileSync(sitesPath, JSON.stringify(sites));

    const result = spawnSync(
      'node',
      ['scripts/check-content.mjs', '--sites', sitesPath, '--root', root],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/sites\[0\]\.video\.url.*HTTPS/i);
  });
});
