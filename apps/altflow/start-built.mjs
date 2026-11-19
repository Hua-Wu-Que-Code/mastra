import { modelCredential } from './scripts/environment.mjs';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const env = {
  ...process.env,
  ALTFLOW_MODELHUB_API_KEY: await modelCredential(),
  MASTRA_PREVIEW_ROOT: root,
  MASTRA_BUILD_SKIP_INSTALL: 'true',
};
let current;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => current?.kill(signal));
function run(command, args) {
  return new Promise((done, reject) => {
    current = spawn(command, args, { cwd: root, stdio: 'inherit', env });
    current.once('error', reject);
    current.once('exit', code => done(code ?? 1));
  });
}
// This preview uses the already installed local framework and integration packages.
// A fresh registry install in the output directory would replace those local builds.
await rm(resolve(root, '.mastra/output/node_modules'), { recursive: true, force: true });
const built = await run(resolve(root, 'node_modules/.bin/mastra'), ['build']);
process.exitCode = built === 0 ? await run(process.execPath, ['.mastra/output/index.mjs']) : built;
