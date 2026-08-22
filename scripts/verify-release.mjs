import { spawnSync } from 'node:child_process';

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

for (const [index, step] of releaseSteps.entries()) {
  console.log(`[verify:release] ${index + 1}/${releaseSteps.length} npm run ${step}`);
  const result = spawnSync('npm', ['run', step], { stdio: 'inherit' });

  if (result.error) {
    console.error(`[verify:release] unable to start ${step}: ${result.error.message}`);
    process.exitCode = 1;
    break;
  }
  if (result.status !== 0) {
    console.error(`[verify:release] ${step} failed with exit code ${result.status ?? 1}`);
    process.exitCode = result.status ?? 1;
    break;
  }
}
