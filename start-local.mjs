import { modelCredential } from './scripts/environment.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const apiKey = await modelCredential();
const child = spawn(resolve(root, 'node_modules/.bin/mastra'), ['dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ALTFLOW_MODELHUB_API_KEY: apiKey, MASTRA_PREVIEW_ROOT: root },
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  process.exitCode = code ?? 1;
});
