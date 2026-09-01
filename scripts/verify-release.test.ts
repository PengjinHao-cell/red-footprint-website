import {
  chmodSync,
  cpSync,
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

import { checkUploadReconciliation } from './check-upload-reconciliation.mjs';

const temporaryDirectories: string[] = [];
const releaseCalls = [
  'run check:production-content',
  'run check:media -- --release',
  'run check:upload-reconciliation',
  'run check:content -- --release',
  'run check:map',
  'run check:city-maps',
  'run lint',
  'run test:run',
  'run build',
];
const expectedCalls = releaseCalls.map(
  (call) => `${call === 'run test:run' ? 'release' : 'local'}|${call}`,
);

function runWithFakeNpm(failingCall?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'verify-release-'));
  temporaryDirectories.push(directory);
  const npmPath = join(directory, 'npm');
  const logPath = join(directory, 'npm.log');
  writeFileSync(
    npmPath,
    `#!/bin/sh
printf '%s|%s\\n' "\${RED_FOOTPRINT_MEDIA_CHECK_MODE:-local}" "$*" >> "$VERIFY_RELEASE_TEST_LOG"
if [ "$*" = "$VERIFY_RELEASE_FAIL_STEP" ]; then
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
      VERIFY_RELEASE_FAIL_STEP: failingCall ?? '__none__',
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
    expect(workflow).toContain('run: npm run test:e2e');
    expect(workflow.indexOf('run: npm run test:e2e')).toBeGreaterThan(
      workflow.indexOf('run: npm run verify:release'),
    );
  });
});

describe('release verification runner', () => {
  it('runs every required local gate in release order', () => {
    const result = runWithFakeNpm();

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(result.calls).toEqual(expectedCalls);
  });

  it('stops at the first failed gate and preserves its non-zero exit code', () => {
    const failingCall = 'run check:upload-reconciliation';
    const result = runWithFakeNpm(failingCall);

    expect(result.status).toBe(23);
    expect(result.calls).toEqual(
      expectedCalls.slice(0, releaseCalls.indexOf(failingCall) + 1),
    );
  });

  it('passes explicit release mode only to the full unit-test process', () => {
    const result = runWithFakeNpm();

    expect(result.calls).toContain('release|run test:run');
    expect(result.calls.filter((call) => call.startsWith('release|'))).toEqual([
      'release|run test:run',
    ]);
  });

  it('keeps reconciliation, digest, HTTPS, and video Range evidence mandatory', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-reconciliation-'));
    temporaryDirectories.push(root);
    cpSync(join(process.cwd(), 'content'), join(root, 'content'), {
      recursive: true,
    });
    const reconciliationPath = join(
      root,
      'content/cloudbase/upload-reconciliation.json',
    );
    const reconciliation = JSON.parse(
      readFileSync(reconciliationPath, 'utf8'),
    );
    reconciliation.objectCount -= 1;
    reconciliation.objects.pop();
    reconciliation.objects[0].http.sha256 = 'f'.repeat(64);
    reconciliation.objects[1].httpsUrl = reconciliation.objects[1].httpsUrl.replace(
      'https://',
      'http://',
    );
    const video = reconciliation.objects.find(
      (object: { mime: string }) => object.mime === 'video/mp4',
    );
    delete video.http.range;
    writeFileSync(
      reconciliationPath,
      `${JSON.stringify(reconciliation, null, 2)}\n`,
    );

    const errors = checkUploadReconciliation(root).join('\n');
    expect(errors).toMatch(/60|missing/i);
    expect(errors).toMatch(/sha256/i);
    expect(errors).toMatch(/HTTPS/i);
    expect(errors).toMatch(/Range evidence/i);
  });
});
