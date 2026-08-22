import { spawnSync } from 'node:child_process';

const releaseSteps = [
  { script: 'check:production-content', args: [] },
  { script: 'check:media', args: ['--', '--release'] },
  { script: 'check:upload-reconciliation', args: [] },
  { script: 'check:content', args: ['--', '--release'] },
  { script: 'check:map', args: [] },
  { script: 'lint', args: [] },
  { script: 'test:run', args: [] },
  { script: 'build', args: [] },
  { script: 'test:e2e', args: [] },
];

for (const [index, step] of releaseSteps.entries()) {
  const npmArguments = ['run', step.script, ...step.args];
  console.log(`[verify:release] ${index + 1}/${releaseSteps.length} npm ${npmArguments.join(' ')}`);
  const result = spawnSync('npm', npmArguments, { stdio: 'inherit' });

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
