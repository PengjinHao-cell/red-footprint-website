import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateContent } from './check-content.mjs';

const temporaryDirectories: string[] = [];
const productionSitesPath = join(process.cwd(), 'src/data/sites.json');

function readProductionSites() {
  expect(existsSync(productionSitesPath)).toBe(true);
  if (!existsSync(productionSitesPath)) return [];
  return JSON.parse(readFileSync(productionSitesPath, 'utf8'));
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

describe('content production gate', () => {
  it('chains Task 3, Task 4, schema, deterministic generation, and drift checks', () => {
    const result = spawnSync('npm', ['run', 'check:content'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status, output).toBe(0);
    expect(output).toMatch(/Task 3 production content.*passed/i);
    expect(output).toMatch(/Task 4 media.*passed/i);
    expect(output).toMatch(/production schema.*passed/i);
    expect(output).toMatch(/generated sites.*byte-identical/i);
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

  it('rejects a manually drifted sites file instead of regenerating over it', () => {
    const sites = readProductionSites();
    if (sites.length === 0) return;
    const directory = mkdtempSync(join(tmpdir(), 'content-drift-'));
    temporaryDirectories.push(directory);
    const sitesPath = join(directory, 'sites.json');
    sites[0].shortName = `${sites[0].shortName}手工改写`;
    writeFileSync(sitesPath, `${JSON.stringify(sites, null, 2)}\n`);

    const result = spawnSync(
      'node',
      ['scripts/check-content.mjs', '--sites', sitesPath],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toMatch(/manual drift|does not match generated output/i);
  });
});
