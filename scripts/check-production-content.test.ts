import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  REQUIRED_FACT_FIELDS,
  REQUIRED_SITE_IDS,
  validateProductionContent,
} from './check-production-content.mjs';

const temporaryDirectories: string[] = [];
const TODAY = '2026-08-22';

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'production-content-'));
  temporaryDirectories.push(root);
  for (const directory of ['content/sources', 'content/sites', 'content/reviews']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  return root;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  writeFileSync(join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture(root: string) {
  for (const [index, siteId] of REQUIRED_SITE_IDS.entries()) {
    const sourceId = `${siteId}-official`;
    const sourceIds = [sourceId];
    const factSourceMap = Object.fromEntries(
      REQUIRED_FACT_FIELDS.map((field) => [field, sourceIds]),
    );
    const factReviews = Object.fromEntries(
      REQUIRED_FACT_FIELDS.map((field) => [field, { status: 'verified', sourceIds }]),
    );

    writeJson(root, `content/sources/${siteId}.json`, {
      siteId,
      sources: [
        {
          id: sourceId,
          title: `权威来源 ${index + 1}`,
          publisher: '政府部门',
          url: `https://www.gov.cn/verified/${siteId}`,
          accessedAt: TODAY,
          authorityType: 'government',
          supports: [...REQUIRED_FACT_FIELDS],
          temporal: { checkedAt: TODAY, validThrough: '2026-11-20' },
        },
      ],
    });

    writeJson(root, `content/sites/${siteId}.json`, {
      id: siteId,
      officialName:
        siteId === 'cpc-first-congress'
          ? '中国共产党第一次全国代表大会纪念馆'
          : `经核实的正式馆名 ${index + 1}`,
      shortName: `场馆 ${index + 1}`,
      province: index < 3 || index > 4 ? '江苏省' : '上海市',
      city: `城市 ${index + 1}`,
      district: `区县 ${index + 1}`,
      address:
        siteId === 'cpc-first-congress'
          ? '上海市黄浦区黄陂南路374号'
          : `完整地址 ${index + 1}号`,
      ...(siteId === 'cpc-first-congress'
        ? { markerAddress: '上海市黄浦区兴业路76号' }
        : {}),
      coordinates: { lat: 31 + index / 100, lng: 118 + index / 100 },
      basicInformation: {
        opening: '经核实的开放安排。',
        reservation: '经核实的预约安排。',
        visitNotice: '经核实的参观提示。',
      },
      historicalImprint: '经权威来源核实的历史印记。',
      peopleStories: '经权威来源核实的人物故事。',
      exhibitsAndSiteMeaning: '经权威来源核实的展品与遗址含义。',
      spiritualLegacy: '根据史实形成的精神传承阐释。',
      teamReflection: {
        type: 'team-reflection',
        text: '这是团队寻访感悟，不作为客观事实来源。',
      },
      factSourceMap,
    });

    writeJson(root, `content/reviews/${siteId}.json`, {
      siteId,
      status: 'verified',
      reviewedAt: TODAY,
      reviewedBy: '内容审核员',
      factReviews,
      temporalReview: { checkedAt: TODAY, validThrough: '2026-11-20' },
      separationReview: {
        factAndReflectionSeparated: true,
        reflectionIntroducesNewFacts: false,
      },
      unresolvedFacts: [],
    });
  }
}

function errors(root: string) {
  return validateProductionContent(root, { today: TODAY }).join('\n');
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('validateProductionContent', () => {
  it('accepts a complete, mapped and reviewed eight-site fixture', () => {
    const root = createRoot();
    createFixture(root);
    expect(validateProductionContent(root, { today: TODAY })).toEqual([]);
  });

  it('rejects an incomplete set of eight sites', () => {
    const root = createRoot();
    createFixture(root);
    rmSync(join(root, 'content/sites/meiyuan-new-village.json'));
    expect(errors(root)).toMatch(/sites.*meiyuan-new-village.*missing/i);
  });

  it('rejects a fact without a source mapping', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sites/sihang-warehouse.json');
    const site = JSON.parse(readFileSync(path, 'utf8'));
    delete site.factSourceMap.people;
    writeJson(root, 'content/sites/sihang-warehouse.json', site);
    expect(errors(root)).toMatch(/people.*source mapping/i);
  });

  it('rejects a mapping whose source does not support the field', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sources/dujiang-victory.json');
    const sources = JSON.parse(readFileSync(path, 'utf8'));
    sources.sources[0].supports = sources.sources[0].supports.filter(
      (field: string) => field !== 'history',
    );
    writeJson(root, 'content/sources/dujiang-victory.json', sources);
    expect(errors(root)).toMatch(/history.*does not support/i);
  });

  it('rejects placeholder source URLs', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sources/yuhuatai-martyrs.json');
    const sources = JSON.parse(readFileSync(path, 'utf8'));
    sources.sources[0].url = 'https://example.com/todo';
    writeJson(root, 'content/sources/yuhuatai-martyrs.json', sources);
    expect(errors(root)).toMatch(/placeholder.*url/i);
  });

  it('rejects unreviewed facts', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/reviews/jiangshangqing-memorial.json');
    const review = JSON.parse(readFileSync(path, 'utf8'));
    review.factReviews.people.status = 'pending';
    writeJson(root, 'content/reviews/jiangshangqing-memorial.json', review);
    expect(errors(root)).toMatch(/people.*must be verified/i);
  });

  it('rejects a reviewed source set that omits a mapped source', () => {
    const root = createRoot();
    createFixture(root);
    const sourcePath = join(root, 'content/sources/sihang-warehouse.json');
    const sources = JSON.parse(readFileSync(sourcePath, 'utf8'));
    sources.sources.push({ ...sources.sources[0], id: 'sihang-alternate' });
    writeJson(root, 'content/sources/sihang-warehouse.json', sources);
    const path = join(root, 'content/reviews/sihang-warehouse.json');
    const review = JSON.parse(readFileSync(path, 'utf8'));
    review.factReviews.history.sourceIds = ['sihang-alternate'];
    writeJson(root, 'content/reviews/sihang-warehouse.json', review);
    expect(errors(root)).toMatch(/history.*review.*mapped source/i);
  });

  it('rejects expired time-sensitive facts', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sources/cpc-first-congress.json');
    const sources = JSON.parse(readFileSync(path, 'utf8'));
    sources.sources[0].temporal.validThrough = '2026-08-21';
    writeJson(root, 'content/sources/cpc-first-congress.json', sources);
    expect(errors(root)).toMatch(/expired.*2026-08-21/i);
  });

  it('rejects a source access date in the future', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sources/sihong-memorial.json');
    const sources = JSON.parse(readFileSync(path, 'utf8'));
    sources.sources[0].accessedAt = '2026-08-23';
    writeJson(root, 'content/sources/sihong-memorial.json', sources);
    expect(errors(root)).toMatch(/accessedAt.*future/i);
  });

  it('keeps the first-congress marker and visitor addresses distinct', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/sites/cpc-first-congress.json');
    const site = JSON.parse(readFileSync(path, 'utf8'));
    site.markerAddress = site.address;
    writeJson(root, 'content/sites/cpc-first-congress.json', site);
    expect(errors(root)).toMatch(/兴业路76号.*黄陂南路374号/);
  });

  it('rejects unresolved facts that leak into published copy', () => {
    const root = createRoot();
    createFixture(root);
    const path = join(root, 'content/reviews/yangzhou-martyrs.json');
    const review = JSON.parse(readFileSync(path, 'utf8'));
    review.unresolvedFacts = [
      { field: 'address', description: '门牌号冲突', excludedFromPublishedCopy: false },
    ];
    writeJson(root, 'content/reviews/yangzhou-martyrs.json', review);
    expect(errors(root)).toMatch(/unresolvedFacts.*excluded/i);
  });
});
