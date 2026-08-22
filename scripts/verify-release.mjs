import { spawnSync } from 'node:child_process';

const MEDIA_CHECK_MODE_ENV = 'RED_FOOTPRINT_MEDIA_CHECK_MODE';
const releaseSteps = [
  { script: 'check:production-content', args: [] },
  { script: 'check:media', args: ['--', '--release'] },
  { script: 'check:upload-reconciliation', args: [] },
  { script: 'check:content', args: ['--', '--release'] },
  { script: 'check:map', args: [] },
  { script: 'lint', args: [] },
  { script: 'test:run', args: [], mediaCheckMode: 'release' },
  { script: 'build', args: [] },
];

for (const [index, step] of releaseSteps.entries()) {
  const npmArguments = ['run', step.script, ...step.args];
  console.log(`[verify:release] ${index + 1}/${releaseSteps.length} npm ${npmArguments.join(' ')}`);
  const result = spawnSync('npm', npmArguments, {
    stdio: 'inherit',
    env: {
      ...process.env,
      [MEDIA_CHECK_MODE_ENV]: step.mediaCheckMode ?? 'local',
    },
  });

  if (result.error) {
    console.error(`[verify:release] unable to start ${step.script}: ${result.error.message}`);
    process.exitCode = 1;
    break;
  }
  if (result.status !== 0) {
    console.error(`[verify:release] ${step.script} failed with exit code ${result.status ?? 1}`);
    process.exitCode = result.status ?? 1;
    break;
  }
}
