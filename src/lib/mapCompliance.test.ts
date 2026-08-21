import { createHash } from 'node:crypto';
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

import { validateMapCompliance } from './mapCompliance';

const temporaryDirectories: string[] = [];

function createTemporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), 'map-compliance-fixture-'));
  temporaryDirectories.push(root);
  return root;
}

function createSyntheticVerifiedRecord(root: string) {
  const relativePath = 'assets/approved-map.geojson';
  const resourcePath = join(root, relativePath);
  const contents = '{"fixture":"synthetic map bytes; not production geography"}';
  mkdirSync(dirname(resourcePath), { recursive: true });
  writeFileSync(resourcePath, contents);

  return {
    status: 'verified' as const,
    publicUseAllowed: true,
    resourceName: '标准地图资源',
    publisher: '自然资源主管部门',
    authorityType: 'natural-resources-authority' as const,
    sourceUrl: 'https://bzdt.ch.mnr.gov.cn/',
    resource: {
      type: 'local' as const,
      path: relativePath,
      sha256: createHash('sha256').update(contents).digest('hex'),
    },
    reviewNumber: 'GS(2099)9999号',
    usageScope: '网站地球边界层展示，禁止超出授权范围使用',
    verifiedAt: '2026-08-21',
    verifiedBy: '合规审核员',
    humanReview: {
      fullTerritory: true,
      nationalBoundaries: true,
      administrativeBoundaries: true,
      islands: true,
    },
  };
}

function errorText(input: unknown, root: string) {
  return validateMapCompliance(input, { root }).join('\n');
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

describe('validateMapCompliance', () => {
  it('accepts a complete synthetic verified record backed by a matching local file', () => {
    const root = createTemporaryRoot();

    expect(validateMapCompliance(createSyntheticVerifiedRecord(root), { root })).toEqual([]);
  });

  it('rejects a missing review number', () => {
    const root = createTemporaryRoot();
    const record = { ...createSyntheticVerifiedRecord(root), reviewNumber: '' };

    expect(errorText(record, root)).toMatch(/reviewNumber/);
  });

  it('rejects a missing authoritative source', () => {
    const root = createTemporaryRoot();
    const record = createSyntheticVerifiedRecord(root);
    delete (record as Partial<typeof record>).sourceUrl;

    expect(errorText(record, root)).toMatch(/sourceUrl/);
  });

  it('rejects an HTTP source URL', () => {
    const root = createTemporaryRoot();
    const record = {
      ...createSyntheticVerifiedRecord(root),
      sourceUrl: 'http://bzdt.ch.mnr.gov.cn/',
    };

    expect(errorText(record, root)).toMatch(/sourceUrl.*HTTPS/i);
  });

  it('rejects blocked metadata even when the missing fields are explicit', () => {
    const root = createTemporaryRoot();
    const record = {
      status: 'blocked',
      publicUseAllowed: false,
      reason: '尚未获得可核验的合规地图资源',
      missingFields: ['sourceUrl', 'reviewNumber', 'resource'],
    };

    expect(errorText(record, root)).toMatch(/status.*blocked/i);
  });

  it('rejects a missing actual resource record', () => {
    const root = createTemporaryRoot();
    const record = createSyntheticVerifiedRecord(root);
    delete (record as Partial<typeof record>).resource;

    expect(errorText(record, root)).toMatch(/resource/);
  });

  it('rejects a local resource path that does not exist', () => {
    const root = createTemporaryRoot();
    const record = createSyntheticVerifiedRecord(root);
    record.resource.path = 'assets/not-present.geojson';

    expect(errorText(record, root)).toMatch(/resource\.path.*does not exist/i);
  });

  it('rejects a local resource whose SHA-256 does not match', () => {
    const root = createTemporaryRoot();
    const record = createSyntheticVerifiedRecord(root);
    record.resource.sha256 = '0'.repeat(64);

    expect(errorText(record, root)).toMatch(/resource\.sha256.*does not match/i);
  });

  it('rejects an incomplete manual territory review', () => {
    const root = createTemporaryRoot();
    const record = createSyntheticVerifiedRecord(root);
    record.humanReview.islands = false;

    expect(errorText(record, root)).toMatch(/humanReview\.islands/);
  });

  it('rejects placeholder or test source domains', () => {
    const root = createTemporaryRoot();
    const record = {
      ...createSyntheticVerifiedRecord(root),
      sourceUrl: 'https://maps.example.test/approved-map',
    };

    expect(errorText(record, root)).toMatch(/sourceUrl.*placeholder/i);
  });
});

describe('map compliance command', () => {
  it('fails closed on the explicit blocked production metadata', () => {
    const result = spawnSync('npm', ['run', 'check:map'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/mapCompliance\.json/i);
    expect(`${result.stdout}${result.stderr}`).toMatch(/status.*blocked/i);
  });

  it('accepts only the temporary synthetic verified fixture', () => {
    const root = createTemporaryRoot();
    const mapPath = join(root, 'mapCompliance.json');
    writeFileSync(mapPath, JSON.stringify(createSyntheticVerifiedRecord(root)));

    const result = spawnSync(
      'npm',
      ['run', 'check:map', '--', '--map', mapPath, '--root', root],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/passed/i);
  });

  it('reports an explicit blocked record as a release failure', () => {
    const root = createTemporaryRoot();
    const mapPath = join(root, 'mapCompliance.json');
    writeFileSync(
      mapPath,
      JSON.stringify({
        status: 'blocked',
        publicUseAllowed: false,
        reason: '缺少合规生产地图资源',
        missingFields: ['resource', 'reviewNumber'],
      }),
    );

    const result = spawnSync(
      'node',
      ['scripts/check-map-compliance.mjs', '--map', mapPath, '--root', root],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/status.*blocked/i);
    expect(`${result.stdout}${result.stderr}`).toMatch(
      /missingFields.*resource.*reviewNumber/i,
    );
  });

  it('reports the exact field when a local digest does not match', () => {
    const root = createTemporaryRoot();
    const mapPath = join(root, 'mapCompliance.json');
    const record = createSyntheticVerifiedRecord(root);
    record.resource.sha256 = 'f'.repeat(64);
    writeFileSync(mapPath, JSON.stringify(record));

    const result = spawnSync(
      'node',
      ['scripts/check-map-compliance.mjs', '--map', mapPath, '--root', root],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/resource\.sha256.*does not match/i);
  });
});
