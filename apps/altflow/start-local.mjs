import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelCredential } from './scripts/environment.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const apiKey = await modelCredential();
const runtimeRoot = resolve(process.env.ALTFLOW_RUNTIME_ROOT ?? process.env.MASTRA_PREVIEW_ROOT ?? root);
await mkdir(resolve(runtimeRoot, 'src/mastra/public'), { recursive: true });
await mkdir(resolve(runtimeRoot, 'data'), { recursive: true });
const child = spawn(resolve(root, 'node_modules/.bin/mastra'), ['dev'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    ALTFLOW_MODELHUB_API_KEY: apiKey,
    ALTFLOW_RUNTIME_ROOT: runtimeRoot,
  },
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  process.exitCode = code ?? 1;
});
