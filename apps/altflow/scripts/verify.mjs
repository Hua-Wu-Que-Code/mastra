import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { backendRepo } from './environment.mjs';

if (!process.env.TEST_STUDIO_DATABASE_URL) {
  throw new Error(
    'Set TEST_STUDIO_DATABASE_URL to a manually prepared studio_auth_verify_ PostgreSQL database. Never use the normal application database.',
  );
}
const repo = backendRepo();
const child = spawn('go', ['test', './internal/controller', '-run', '^TestStudioAuthWithPostgres$', '-count=1', '-v'], {
  cwd: repo,
  stdio: 'inherit',
  env: { ...process.env, TEST_STUDIO_VERIFY_SCRIPT: fileURLToPath(new URL('./verify-auth.mjs', import.meta.url)) },
});
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  process.exitCode = code ?? 1;
});
