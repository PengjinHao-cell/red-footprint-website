import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const releaseSteps = [
  'check:production-content',
  'check:media',
  'check:upload-reconciliation',
  'check:content',
  'check:map',
  'lint',
  'test:run',
  'build',
  'test:e2e',
];

function runWithFakeNpm(failingStep?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'verify-release-'));
  temporaryDirectories.push(directory);
  const npmPath = join(directory, 'npm');
  const logPath = join(directory, 'npm.log');
  writeFileSync(
    npmPath,
    `#!/bin/sh
printf '%s\\n' "$*" >> "$VERIFY_RELEASE_TEST_LOG"
if [ "$*" = "run $VERIFY_RELEASE_FAIL_STEP" ]; then
  exit 23
fi
exit 0
`,
  );
  chmodSync(npmPath, 0o755);

  const result = spawnSync(process.execPath, ['scripts/verify-release.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH ?? ''}`,
      VERIFY_RELEASE_FAIL_STEP: failingStep ?? '__none__',
      VERIFY_RELEASE_TEST_LOG: logPath,
    },
  });

  return {
    ...result,
    calls: existsSync(logPath)
      ? readFileSync(logPath, 'utf8').trim().split('\n')
      : [],
  };
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { force: true, recursive: true });
  });
});

describe('release verification configuration', () => {
  it('exposes the release verifier through package.json', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    expect(packageJson.scripts?.['verify:release']).toBe(
      'node scripts/verify-release.mjs',
    );
  });

  it('keeps CI read-only and runs the complete release verification', () => {
    const workflowPath = '.github/workflows/ci.yml';

    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) return;

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toMatch(/permissions:\s*\n\s+contents:\s*read\b/);
    expect(workflow).not.toMatch(/\b(?:write|id-token|secret|deploy)\b/i);
    expect(workflow).toMatch(/pull_request:\s*\n\s+branches:\s*\[main\]/);
    expect(workflow).toMatch(/push:\s*\n\s+branches:\s*\[main\]/);
    expect(workflow).toContain('node-version: 24.19.0');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain(
      'run: npx playwright install --with-deps chromium webkit',
    );
    expect(workflow).toContain('run: npm run verify:release');
  });
});

describe('release verification runner', () => {
  it('runs every required local gate in release order', () => {
    const result = runWithFakeNpm();

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(result.calls).toEqual(releaseSteps.map((step) => `run ${step}`));
  });

  it('stops at the first failed gate and preserves its non-zero exit code', () => {
    const result = runWithFakeNpm('check:upload-reconciliation');

    expect(result.status).toBe(23);
    expect(result.calls).toEqual(
      releaseSteps
        .slice(0, releaseSteps.indexOf('check:upload-reconciliation') + 1)
        .map((step) => `run ${step}`),
    );
  });
});
