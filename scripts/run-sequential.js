/**
 * Run npm scripts sequentially (PowerShell-safe; no shell && needed).
 * Usage: node scripts/run-sequential.js scriptA scriptB ...
 */
const { spawnSync } = require('node:child_process');

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
  console.error('Usage: node scripts/run-sequential.js <npm-script> [more...]');
  process.exit(1);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const name of scripts) {
  console.log(`\n> npm run ${name}\n`);
  const result = spawnSync(npmCmd, ['run', name], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    process.exit(code);
  }
}
