import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { backendRepo } from './scripts/environment.mjs';

// The separate checkout contains the latest Go main plus a local auth-only entry.
// Its handlers and services are the same ones used by the full backend.
const repo = backendRepo();
const envFile = process.env.ALTFLOW_BACKEND_ENV_FILE ?? resolve(repo, '.env');
const config = parseEnv(await readFile(envFile, 'utf8'));
const child = spawn('go', ['run', './cmd/studio-auth'], {
  cwd: resolve(repo),
  stdio: 'inherit',
  env: {
    ...config,
    ...process.env,
    APP_ENV: process.env.APP_ENV ?? config.APP_ENV ?? 'development',
    NODE_ENV: process.env.NODE_ENV ?? config.NODE_ENV ?? 'development',
    LISTEN_ADDR: '127.0.0.1:8080',
  },
  detached: true,
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    if (child.pid) process.kill(-child.pid, signal);
  });
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  process.exitCode = code ?? 1;
});
