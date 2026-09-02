import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('map resource command', () => {
  it('passes the production source, digest, geometry, eight-marker, and visual checks', () => {
    const result = spawnSync('npm', ['run', 'check:map'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).toMatch(/source.*passed/i);
    expect(output).toMatch(/digest.*passed/i);
    expect(output).toMatch(/geometry.*passed/i);
    expect(output).toMatch(/national layer.*passed/i);
    expect(output).toMatch(/site projection.*passed/i);
    expect(output).toMatch(/zoom range.*passed/i);
    expect(output).toMatch(/hit targets.*passed/i);
    expect(output).toMatch(/visual integrity.*passed/i);
  });

  it('uses the Task 2 resource checker instead of the legacy approval checker', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['check:map']).toBe(
      'node scripts/check-map-resource.mjs',
    );
  });
});
