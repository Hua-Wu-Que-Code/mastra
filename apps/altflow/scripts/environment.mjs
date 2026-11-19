import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

// Load only explicitly configured files. Never search another checkout for secrets.
const local = parseEnv(
  await readFile(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  }),
);
for (const [name, value] of Object.entries(local)) {
  if (process.env[name] === undefined) process.env[name] = value;
}
export async function modelCredential() {
  if (process.env.ALTFLOW_MODELHUB_API_KEY) return process.env.ALTFLOW_MODELHUB_API_KEY;
  const envFile = process.env.ALTFLOW_MODELHUB_ENV_FILE;
  if (!envFile) throw new Error('Set ALTFLOW_MODELHUB_API_KEY or ALTFLOW_MODELHUB_ENV_FILE');
  const config = parseEnv(await readFile(envFile, 'utf8'));
  if (!config.LITELLM_MASTER_KEY) throw new Error('Configured model credential file has no LITELLM_MASTER_KEY');
  return config.LITELLM_MASTER_KEY;
}
export function backendRepo() {
  if (!process.env.ALTFLOW_BACKEND_REPO) throw new Error('Set ALTFLOW_BACKEND_REPO to the Go backend checkout');
  return process.env.ALTFLOW_BACKEND_REPO;
}
