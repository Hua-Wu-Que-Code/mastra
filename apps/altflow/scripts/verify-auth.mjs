import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm, open } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelCredential } from './environment.mjs';
import { modelHubFixture } from './modelhub-fixture.mjs';

// Invoked by the Go integration test with real database-backed fixture accounts.
// No credentials, tokens or provider responses are printed.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.env.TEST_GO_AUTH_URL && process.env.TEST_LOGIN_PASSWORD && process.env.TEST_STUDIO_DATABASE_URL);
const sandbox = await mkdtemp(resolve(tmpdir(), 'studio-auth-http-'));
const listener = createServer();
await new Promise((resolve, reject) => {
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1', resolve);
});
const address = listener.address();
assert.ok(address && typeof address === 'object');
const port = address.port;
await new Promise((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
const origin = `http://127.0.0.1:${port}`;
const log = await open(resolve(sandbox, 'server.log'), 'w');
let server;
const modelHub = process.env.TEST_STUDIO_LIVE_MODEL === '1' ? undefined : await modelHubFixture();
function sql(statement) {
  return execFileSync(
    'psql',
    ['-q', '-v', 'ON_ERROR_STOP=1', '-d', process.env.TEST_STUDIO_DATABASE_URL, '-c', statement],
    { encoding: 'utf8' },
  );
}
const checks = [];
let completed = false;
try {
  await mkdir(resolve(sandbox, 'data'), { recursive: true });
  await mkdir(resolve(sandbox, 'src/mastra/public'), { recursive: true });
  await mkdir(resolve(sandbox, '.cache'), { recursive: true });
  await cp(resolve(root, 'src/mastra'), resolve(sandbox, 'src/mastra'), {
    recursive: true,
    filter: source => source !== resolve(root, 'src/mastra/public'),
  });
  const fixtureModule = resolve(sandbox, 'src/mastra/index.ts');
  await writeFile(
    fixtureModule,
    (await readFile(fixtureModule, 'utf8')) +
      `\nawait knowledge.upsertPage({scope:'resource:altflow%3Astudio-check-alice',path:'alice-private',name:'Alice private note',body:'ALICE_PRIVATE_KNOWLEDGE'});\n`,
  );
  await cp(resolve(root, 'package.json'), resolve(sandbox, 'package.json'));
  await symlink(resolve(root, 'node_modules'), resolve(sandbox, 'node_modules'));
  await symlink(resolve(root, '.cache/embeddings'), resolve(sandbox, '.cache/embeddings'));
  const credential =
    process.env.TEST_STUDIO_LIVE_MODEL === '1' ? await modelCredential() : 'auth-test-does-not-call-a-model';
  server = spawn(resolve(root, 'node_modules/.bin/mastra'), ['dev'], {
    cwd: sandbox,
    stdio: ['ignore', log.fd, log.fd],
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      STUDIO_PORT: String(port),
      ALTFLOW_RUNTIME_ROOT: sandbox,
      MASTRA_PREVIEW_ROOT: sandbox,
      ALTFLOW_BACKEND_URL: process.env.TEST_GO_AUTH_URL,
      ALTFLOW_LEGACY_OWNER_ID: '',
      STUDIO_ALLOWED_ORIGINS: origin,
      ALTFLOW_MODELHUB_API_KEY: credential,
      ALTFLOW_MODELHUB_BASE_URL: modelHub?.baseURL ?? 'https://modelhub.altflow.cn/v1',
    },
  });
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) break;
    try {
      if ((await fetch(origin + '/account/session')).status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, `test server did not start; inspect ${sandbox}/server.log`);
  async function login(name, password = process.env.TEST_LOGIN_PASSWORD) {
    const response = await fetch(origin + '/account/sign-in', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `studio-check-${name}@example.test`, password }),
    });
    assert.equal(response.status, 200, `${name} login`);
    const cookies = response.headers.getSetCookie();
    assert.ok(cookies.every(cookie => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
    const body = await response.json();
    assert.equal('token' in body, false);
    return { cookie: cookies.map(cookie => cookie.split(';')[0]).join('; '), body };
  }
  async function request(path, user, method = 'GET', body) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        Origin: origin,
        ...(user ? { Cookie: user.cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  assert.equal((await request('/api/agents')).status, 401);
  const spoof = await fetch(origin + '/api/agents', {
    headers: { 'x-mastra-dev-playground': 'true', 'x-mastra-user-id': 'studio-check-admin' },
  });
  assert.equal(spoof.status, 401);
  const wrong = await fetch(origin + '/account/sign-in', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'studio-check-alice@example.test', password: 'wrong-password' }),
  });
  assert.equal(wrong.status, 401);
  const csrf = await fetch(origin + '/account/sign-in', {
    method: 'POST',
    headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(csrf.status, 403);
  checks.push('unauthenticated, forged identity, invalid password and cross-origin login rejected');
  const admin = await login('admin'),
    alice = await login('alice'),
    bob = await login('bob');
  assert.equal(alice.body.resourceId, 'altflow:studio-check-alice');
  assert.equal((await request('/account/session', alice)).body.user.role, 'creator');
  assert.equal((await request('/api/agents', alice)).status, 200);
  for (const path of ['/api/workspaces', '/api/mcp/v0/servers', '/api/observability/traces', '/api/stored/agents']) {
    assert.equal((await request(path, alice)).status, 403, `creator blocked: ${path}`);
  }
  assert.equal((await request('/api/workspaces', admin)).status, 200);
  const providers = await request('/api/agents/providers', admin);
  assert.equal(providers.status, 200);
  assert.deepEqual(
    providers.body.providers.map(provider => provider.id),
    ['altflow'],
    'only ModelHub is visible',
  );
  assert.ok(providers.body.providers[0].models.includes('deepseek-v4-pro'), 'product model is selectable');
  assert.equal(
    providers.body.providers[0].models.some(model => model.startsWith('tier-')),
    false,
    'internal routes stay on the server',
  );
  assert.equal(
    (
      await request('/api/agents/creator-agent/stream', alice, 'POST', {
        messages: [],
        model: { id: 'external' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('/api/agents/creator-agent/stream', alice, 'POST', {
        messages: [],
        requestContext: { mastra__resourceId: 'altflow:studio-check-bob' },
      })
    ).status,
    403,
  );
  checks.push('Go roles enforced on the API; configuration and request-context overrides rejected');
  const threadID = 'auth-verify-' + Date.now();
  const created = await request('/api/memory/threads?agentId=creator-agent', alice, 'POST', {
    id: threadID,
    threadId: threadID,
    title: 'Alice private',
    resourceId: 'forged-bob-resource',
  });
  assert.equal(created.status, 200, 'create private thread');
  const actualId = created.body.id;
  assert.equal(created.body.resourceId, alice.body.resourceId, 'server binds resource');
  assert.ok(
    [403, 404].includes((await request(`/api/memory/threads/${actualId}?agentId=creator-agent`, admin)).status),
    'administrators cannot read another user thread',
  );
  const adminListed = await request(
    '/api/memory/threads?agentId=creator-agent&resourceId=' + alice.body.resourceId,
    admin,
  );
  assert.equal(adminListed.status, 200);
  assert.equal(
    JSON.stringify(adminListed.body).includes(actualId),
    false,
    'administrators cannot list another user threads',
  );
  assert.ok([403, 404].includes((await request(`/api/memory/threads/${actualId}?agentId=creator-agent`, bob)).status));
  const listed = await request('/api/memory/threads?agentId=creator-agent&resourceId=' + alice.body.resourceId, bob);
  assert.equal(listed.status, 200);
  assert.equal(JSON.stringify(listed.body).includes(actualId), false);
  for (const [suffix, method, body] of [
    ['', 'PATCH', { title: 'stolen' }],
    ['', 'DELETE'],
    ['/clone', 'POST', {}],
    ['/messages', 'GET'],
    ['/working-memory', 'GET'],
    ['/working-memory', 'POST', { workingMemory: 'stolen' }],
  ]) {
    const response = await request(`/api/memory/threads/${actualId}${suffix}?agentId=creator-agent`, bob, method, body);
    assert.ok([403, 404].includes(response.status), `cross-user ${method} ${suffix}: ${response.status}`);
    const adminResponse = await request(
      `/api/memory/threads/${actualId}${suffix}?agentId=creator-agent`,
      admin,
      method,
      body,
    );
    assert.ok(
      [403, 404].includes(adminResponse.status),
      `administrator cross-user ${method} ${suffix}: ${adminResponse.status}`,
    );
  }
  assert.equal((await request(`/api/memory/threads/${actualId}?agentId=creator-agent`, alice)).status, 200);
  assert.ok(
    [403, 404].includes(
      (
        await request(
          '/api/memory/observational-memory?agentId=creator-agent&resourceId=' +
            alice.body.resourceId +
            '&threadId=' +
            actualId,
          bob,
        )
      ).status,
    ),
  );
  assert.ok(
    [403, 404].includes(
      (
        await request(
          '/api/memory/observational-memory?agentId=creator-agent&resourceId=' +
            alice.body.resourceId +
            '&threadId=' +
            actualId,
          admin,
        )
      ).status,
    ),
  );
  for (const endpoint of ['send-message', 'queue-message', 'threads/subscribe']) {
    const body =
      endpoint === 'threads/subscribe'
        ? { threadId: actualId, resourceId: alice.body.resourceId, withRunStatus: true }
        : {
            threadId: actualId,
            resourceId: alice.body.resourceId,
            message: [{ type: 'text', text: 'Cross-user delivery must fail' }],
          };
    for (const outsider of [bob, admin]) {
      assert.equal(
        (await request('/api/agents/creator-agent/' + endpoint, outsider, 'POST', body)).status,
        403,
        'cross-user ' + endpoint + ' must fail even for administrators',
      );
    }
    if (endpoint !== 'threads/subscribe') {
      assert.equal(
        (
          await request('/api/agents/creator-agent/' + endpoint, alice, 'POST', {
            ...body,
            ifIdle: {
              streamOptions: { requireToolApproval: true, model: 'altflow/deepseek-v4-pro' },
            },
          })
        ).status,
        403,
        'creator cannot inject execution settings through ' + endpoint,
      );
    }
  }
  const subscription = await fetch(origin + '/api/agents/creator-agent/threads/subscribe', {
    method: 'POST',
    headers: { Origin: origin, Cookie: alice.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      threadId: actualId,
      resourceId: alice.body.resourceId,
      withRunStatus: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(subscription.status, 200, 'creator can subscribe to their own conversation');
  await subscription.body.cancel();
  if (modelHub) {
    modelHub.state.toolCallText = '一二三';
    const toolRun = await request('/api/agents/creator-agent/generate', alice, 'POST', {
      messages: [{ role: 'user', content: 'Run the countText tool automatically.' }],
      memory: { thread: actualId, resource: alice.body.resourceId },
    });
    assert.equal(toolRun.status, 200, 'tools can run without a user approval request: ' + JSON.stringify(toolRun.body));
    assert.equal(toolRun.body.text, 'verified', 'agent continues after executing the tool');
    assert.ok(
      modelHub.state.requests.some(({ body }) =>
        body.messages.some(message => message.role === 'tool' && String(message.content).includes('"characters":3')),
      ),
      'the next model step must receive the actual countText result',
    );
    modelHub.state.toolCallText = undefined;
    checks.push('tool executes without approval and supplies its real result to the next model step');

    async function eventually(predicate, label) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.fail(label);
    }
    modelHub.state.blocked = true;
    try {
      const initial = await request('/api/agents/creator-agent/send-message', alice, 'POST', {
        threadId: actualId,
        resourceId: alice.body.resourceId,
        message: 'Busy initial marker',
      });
      assert.equal(initial.status, 200, 'creator starts a run through message admission');
      await eventually(
        () => modelHub.state.requests.some(({ body }) => JSON.stringify(body.messages).includes('Busy initial marker')),
        'first run must be busy at the model boundary',
      );
      const queued = await request('/api/agents/creator-agent/queue-message', alice, 'POST', {
        threadId: actualId,
        resourceId: alice.body.resourceId,
        message: 'Queued follow-up marker',
      });
      assert.equal(queued.status, 200, 'creator can queue a follow-up');
      const queueTarget = { threadId: actualId, resourceId: alice.body.resourceId };
      const later = await request('/api/agents/creator-agent/queue-message', alice, 'POST', {
        ...queueTarget,
        message: 'Reordered follow-up marker',
      });
      const removed = await request('/api/agents/creator-agent/queue-message', alice, 'POST', {
        ...queueTarget,
        message: 'Deleted follow-up marker',
      });
      const steerQueue = await request('/api/agents/creator-agent/queue-message', alice, 'POST', {
        ...queueTarget,
        message: 'Queued steer marker',
      });
      assert.equal(later.status, 200);
      assert.equal(removed.status, 200);
      assert.equal(steerQueue.status, 200);
      assert.ok(later.body.signal?.id && removed.body.signal?.id && steerQueue.body.signal?.id);
      assert.equal(
        (
          await request('/api/agents/creator-agent/threads/queue/update', bob, 'POST', {
            ...queueTarget,
            signalId: later.body.signal.id,
            action: 'move-up',
          })
        ).status,
        403,
        'another user cannot reorder this queue',
      );
      assert.equal(
        (
          await request('/api/agents/creator-agent/threads/queue/update', alice, 'POST', {
            ...queueTarget,
            signalId: later.body.signal.id,
            action: 'move-up',
          })
        ).body.updated,
        true,
        'queued turn can be moved ahead of the earlier one',
      );
      assert.deepEqual(
        (
          await request('/api/agents/creator-agent/threads/signals/cancel', alice, 'POST', {
            ...queueTarget,
            signalIds: [removed.body.signal.id],
          })
        ).body.cancelledSignalIds,
        [removed.body.signal.id],
        'pending turn can be deleted',
      );
      assert.equal(
        (
          await request('/api/agents/creator-agent/threads/queue/update', alice, 'POST', {
            ...queueTarget,
            signalId: steerQueue.body.signal.id,
            action: 'steer',
          })
        ).body.updated,
        true,
        'queued turn can steer the current run without a resend',
      );

      const steered = await request('/api/agents/creator-agent/send-message', alice, 'POST', {
        threadId: actualId,
        resourceId: alice.body.resourceId,
        message: 'Steer current marker',
      });
      assert.equal(steered.status, 200, 'creator can steer a busy run');
      assert.equal(steered.body.runId, initial.body.runId, 'steering targets the active run');
      assert.notEqual(queued.body.runId, initial.body.runId, 'queued input belongs to a future run');
      assert.equal(
        modelHub.state.requests.some(({ body }) => JSON.stringify(body.messages).includes('Queued follow-up marker')),
        false,
        'queued input must not interrupt the blocked current run',
      );
    } finally {
      modelHub.state.blocked = false;
    }
    await eventually(
      () =>
        modelHub.state.requests.some(({ body }) => JSON.stringify(body.messages).includes('Queued follow-up marker')),
      'queued input must start a new model turn after the current run finishes',
    );
    await eventually(async () => {
      const saved = await request(`/api/memory/threads/${actualId}/messages?agentId=creator-agent`, alice);
      return (
        JSON.stringify(saved.body).includes('Queued follow-up marker') &&
        JSON.stringify(saved.body).includes('Steer current marker')
      );
    }, 'queued and steered messages must both persist');
    await eventually(
      () =>
        modelHub.state.requests.some(({ body }) =>
          JSON.stringify(body.messages).includes('Reordered follow-up marker'),
        ),
      'reordered input must execute',
    );
    const requests = modelHub.state.requests.map(({ body }) => JSON.stringify(body.messages));
    assert.ok(
      requests.findIndex(body => body.includes('Reordered follow-up marker')) <
        requests.findIndex(body => body.includes('Queued follow-up marker')),
      'actual model requests follow the edited queue order',
    );
    assert.ok(
      requests.every(body => !body.includes('Deleted follow-up marker')),
      'deleted input must never reach the model',
    );
    assert.ok(
      requests.some(body => body.includes('Queued steer marker') && !body.includes('Queued follow-up marker')),
      'steered input must reach the active run before the queued turn',
    );
    checks.push('busy queue supports real deletion, steering, reordering and cross-user denial');
  }
  const userMetadata = await request('/api/memory/threads?agentId=creator-agent', alice, 'POST', {
    resourceId: alice.body.resourceId,
    title: 'JSON field notes',
    metadata: { model: 'a word in user content', instructions: 'notes' },
  });
  assert.equal(userMetadata.status, 200, 'user metadata is content, not an agent override');
  const ownKnowledge = await request('/api/knowledge/creatorKnowledge/search?q=ALICE_PRIVATE_KNOWLEDGE', alice);
  assert.equal(ownKnowledge.status, 200);
  assert.ok(JSON.stringify(ownKnowledge.body).includes('ALICE_PRIVATE_KNOWLEDGE'), 'owner can read private knowledge');
  for (const viewer of [bob, admin]) {
    const privateKnowledge = await request('/api/knowledge/creatorKnowledge/search?q=ALICE_PRIVATE_KNOWLEDGE', viewer);
    assert.equal(privateKnowledge.status, 200);
    assert.equal(
      JSON.stringify(privateKnowledge.body).includes('ALICE_PRIVATE_KNOWLEDGE'),
      false,
      'private knowledge is isolated even from administrators',
    );
  }
  const config = await request('/api/memory/config?agentId=creator-agent', alice);
  assert.equal(config.body.config.observationalMemory.enabled, false);
  checks.push(
    'thread listing, read, write, delete, clone, working memory, observation and private knowledge isolation',
  );
  const spoofContext = encodeURIComponent(
    JSON.stringify({
      mastra__resourceId: alice.body.resourceId,
      mastra__scopes: ['library:creator'],
    }),
  );
  assert.ok(
    [403, 404].includes(
      (await request(`/api/memory/threads/${actualId}?agentId=creator-agent&requestContext=${spoofContext}`, bob))
        .status,
    ),
  );
  const knowledge = await request('/api/knowledge/creatorKnowledge/search?q=' + encodeURIComponent('创作'), alice);
  assert.equal(knowledge.status, 200);
  assert.ok(JSON.stringify(knowledge.body).includes('中文创作指南'));
  if (process.env.TEST_STUDIO_LIVE_MODEL === '1') {
    const response = await fetch(origin + '/api/agents/creator-agent/stream', {
      method: 'POST',
      headers: { Origin: origin, Cookie: alice.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '只回复：已登录' }],
        memory: { thread: actualId, resource: alice.body.resourceId },
      }),
      signal: AbortSignal.timeout(90000),
    });
    assert.equal(response.status, 200, 'authenticated Agent stream');
    const stream = await response.text();
    assert.ok(stream.includes('text-delta'), 'model must emit text');
    assert.equal(stream.includes('\"type\":\"error\"'), false, 'stream must finish without error');
    const saved = await request(`/api/memory/threads/${actualId}/messages?agentId=creator-agent`, alice);
    assert.ok(saved.body.messages.some(message => message.role === 'assistant'));
    checks.push('authenticated real model response and private message persistence');
  }

  sql("UPDATE users SET role='admin' WHERE id='studio-check-alice'");
  assert.equal((await request('/account/session', alice)).body.user.role, 'admin');
  assert.equal((await request('/api/workspaces', alice)).status, 200);
  sql("UPDATE users SET role='creator',disabled=true WHERE id='studio-check-alice'");
  assert.equal((await request('/api/agents', alice)).status, 401);
  assert.equal((await request('/account/session', alice)).status, 401);
  checks.push('role changes and account disabling take effect on the next request');
  assert.equal((await request('/account/sign-out', bob, 'POST', {})).status, 200);
  assert.equal((await request('/api/agents', bob)).status, 401);
  checks.push('logout revokes the Go token');
  completed = true;
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  if (server?.pid) {
    const exited =
      server.exitCode !== null
        ? Promise.resolve()
        : new Promise(resolve => {
            const timeout = setTimeout(resolve, 5000);
            server.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {}
    await exited;
    // The dev CLI owns watcher/build children. Stop the entire test process
    // group before deleting its output directory, including surviving children.
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {}
  }
  await modelHub?.close();
  await log.close();
  // Preserve logs on a failed run; successful artifacts contain no user data.
  if (completed) await rm(sandbox, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
