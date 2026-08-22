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

const temporaryDirectories: string[] = [];
const productionSitesPath = join(process.cwd(), 'src/data/sites.json');
const MEDIA_CHECK_MODE_ENV = 'RED_FOOTPRINT_MEDIA_CHECK_MODE';

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
  it('chains Task 3, Task 4, schema, deterministic generation, and drift checks', () => {
    const result = spawnSync('npm', ['run', 'check:content', '--', '--release'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status, output).toBe(0);
    expect(output).toMatch(/Task 3 production content.*passed/i);
    expect(output).toMatch(/Task 4 media.*passed/i);
    expect(output).toMatch(/production schema.*passed/i);
    expect(output).toMatch(/release build inputs.*manifest.*reconciliation/i);
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

  it('passes explicit release mode in a clean committed project export', () => {
    const root = createCommittedProjectRoot();

    expect(runContentCheck(['--release'], root)).toBe(0);
  });

  it('does not silently relax the default local gate in a clean export', () => {
    const root = createCommittedProjectRoot();

    withMediaCheckMode(undefined, () => {
      expect(runContentCheck([], root)).toBe(1);
    });
  });

  it('passes a clean export when CI explicitly selects release mode', () => {
    const root = createCommittedProjectRoot();

    withMediaCheckMode('release', () => {
      expect(runContentCheck([], root)).toBe(0);
    });
  });

  it('rejects non-HTTPS production media in release mode', () => {
    const root = createCommittedProjectRoot();
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
