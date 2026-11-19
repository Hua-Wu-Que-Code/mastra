import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, runOptions } from './tool-fixture.mjs';

test('ordinary subagents remain available with teamwork disabled', async t => {
  const f = await fixture(t);
  await f.agent.generate('Work independently.', {
    ...runOptions(),
    disableSubAgents: true,
  });
  const names = f.requests.at(-1).tools.map(tool => tool.function.name);
  for (const name of ['subagent', 'subagent_fork', 'list_agents', 'send_message', 'wait_agent', 'interrupt_agent'])
    assert.ok(names.includes(name), `${name} is available independently of team mode`);
  assert.ok(!names.includes('team_task_create'));
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('Timed out waiting for runtime state');
    await delay(10);
  }
}
const childRequest = body =>
  body.messages.some(m => m.role === 'system' && JSON.stringify(m.content).includes('Your name is worker.'));

test('a child finishing after parent deletion does not recreate the deleted conversation', async t => {
  const f = await fixture(t);
  const { context } = await import('./tool-fixture.mjs');
  await f.agent.generate('Initialize.', runOptions());
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  let finish;
  const completed = new Promise(resolve => {
    finish = resolve;
  });
  let started = false;
  f.setHandler(async body => {
    if (!childRequest(body)) return { text: 'Unexpected parent wake.' };
    started = true;
    await completed;
    return { text: 'CHILD-FINISHED-AFTER-DELETE' };
  });
  await f.tree.runtime.spawn(actor, { name: 'worker', description: 'Worker', prompt: 'Finish later.' });
  await until(() => started);
  await f.memoryStore.deleteThread({ threadId: actor.root });
  finish();
  await until(async () => (await f.treeStore.read('alice', actor.root)).children[0]?.state === 'completed');
  // close drains background completion delivery, including any parent wake.
  await f.tree.runtime.close();
  assert.equal(await f.memoryStore.getThreadById({ threadId: actor.root }), null);
  assert.equal(f.requests.filter(body => !childRequest(body)).length, 1);
});

test('dynamic background child completes nine tools and notifies the actual parent run', async t => {
  const f = await fixture(t);
  let rootSteps = 0,
    childSteps = 0;
  f.setHandler(body => {
    if (childRequest(body))
      return ++childSteps <= 9
        ? { calls: [{ name: 'countText', args: { text: 'child work' } }] }
        : { text: 'CHILD-NINE-COMPLETE' };
    if (++rootSteps === 1)
      return {
        calls: [
          {
            name: 'subagent',
            args: {
              name: 'worker',
              description: 'Count nine times',
              prompt: 'Execute nine counts.',
            },
          },
        ],
      };
    if (!JSON.stringify(body.messages).includes('CHILD-NINE-COMPLETE'))
      return { calls: [{ name: 'wait_agent', args: { timeout_ms: 10000 } }] };
    return { text: 'PARENT-CONFIRMED' };
  });
  const output = await f.agent.stream('Delegate to a dynamic worker and wait for it.', runOptions());
  await output.consumeStream();
  assert.equal(await output.text, 'PARENT-CONFIRMED');
  assert.equal(childSteps, 10);
  const tree = await f.treeStore.read('alice', 'alice-thread');
  assert.equal(tree.children[0].state, 'completed');
  assert.equal(tree.children[0].result, 'CHILD-NINE-COMPLETE');
  assert.ok(tree.mail.some(mail => mail.type === 'completion' && mail.delivered));
  const root = f.requests.filter(body => !childRequest(body));
  assert.ok(
    root.some(body =>
      body.messages.some(message => message.role === 'tool' && String(message.content).includes('activation')),
    ),
  );
  assert.ok(
    f.requests
      .filter(childRequest)
      .every(body => !body.tools.some(tool => ['ask_user', 'submit_plan'].includes(tool.function.name))),
  );
});

test('fork excludes the current user turn and uses private durable child history', async t => {
  const f = await fixture(t);
  f.responses.push({ text: 'PRIOR-ANSWER' });
  await f.agent.generate('PRIOR-QUESTION', runOptions());
  f.responses.push({
    calls: [
      {
        name: 'subagent_fork',
        args: { name: 'worker', description: 'Fork', prompt: 'FORK-TASK' },
      },
    ],
  });
  f.setHandler(body => (childRequest(body) ? { text: 'FORK-DONE' } : undefined));
  await f.agent.generate('CURRENT-SECRET-TURN', runOptions());
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  const request = f.requests.find(childRequest);
  assert.ok(JSON.stringify(request.messages).includes('PRIOR-QUESTION'));
  assert.ok(JSON.stringify(request.messages).includes('PRIOR-ANSWER'));
  assert.ok(!JSON.stringify(request.messages).includes('CURRENT-SECRET-TURN'));
  const child = (await f.treeStore.read('alice', 'alice-thread')).children[0];
  const thread = await f.memoryStore.getThreadById({ threadId: child.id });
  assert.notEqual(thread.resourceId, 'altflow:alice');
});

test('team tasks enforce revision ownership and dependencies and survive switching teamwork off', async t => {
  const f = await fixture(t);
  await f.agent.generate('Initialize.', runOptions());
  const { context } = await import('./tool-fixture.mjs');
  const { TeamBoard } = await import('../src/mastra/subagents/team.ts');
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  const board = new TeamBoard(f.tree.runtime);
  await assert.rejects(board.create(actor, { subject: 'Disabled', description: 'No board' }), /TEAM_DISABLED/);
  f.setTeamEnabled(true);
  await f.agent.generate('Enable shared work.', runOptions());
  assert.ok(f.requests.at(-1).tools.some(tool => tool.function.name === 'team_task_create'));
  const first = await board.create(actor, {
    subject: 'First',
    description: 'Write',
    write_scopes: ['outputs'],
  });
  const second = await board.create(actor, {
    subject: 'Second',
    description: 'Review',
    blocked_by: [first.id],
    write_scopes: ['outputs/review.md'],
  });
  await assert.rejects(
    board.update(actor, {
      task_id: second.id,
      expected_revision: 1,
      action: 'claim',
    }),
    /TASK_NOT_READY/,
  );
  await assert.rejects(
    board.update(actor, {
      task_id: first.id,
      expected_revision: 1,
      action: 'set_dependencies',
      blocked_by: [second.id],
    }),
    /DEPENDENCY_CYCLE/,
  );
  const claims = await Promise.allSettled(
    [1, 2].map(() =>
      board.update(actor, {
        task_id: first.id,
        expected_revision: 1,
        action: 'claim',
      }),
    ),
  );
  assert.equal(claims.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(claims.find(result => result.status === 'rejected').reason.message, /REVISION_CONFLICT/);
  assert.deepEqual((await board.get(actor, second.id)).writeScopeWarnings, [first.id]);
  await board.update(actor, {
    task_id: first.id,
    expected_revision: 2,
    action: 'complete',
  });
  await board.update(actor, {
    task_id: second.id,
    expected_revision: 1,
    action: 'reassign',
    owner: 'lead',
  });
  assert.equal(
    (
      await board.update(actor, {
        task_id: second.id,
        expected_revision: 2,
        action: 'claim',
      })
    ).status,
    'in_progress',
  );
  f.setTeamEnabled(false);
  await assert.rejects(board.list(actor, {}), /TEAM_DISABLED/);
  assert.equal((await f.treeStore.read('alice', 'alice-thread')).tasks.length, 2);
  await f.agent.generate('Disable team tools.', runOptions());
  assert.ok(!f.requests.at(-1).tools.some(tool => tool.function.name.startsWith('team_task_')));
  assert.ok(f.requests.at(-1).tools.some(tool => tool.function.name === 'subagent'));
});

test('interrupt preserves history and a message resumes a child without opening another tree', async t => {
  const f = await fixture(t);
  const { context } = await import('./tool-fixture.mjs');
  const { childContext } = await import('../src/mastra/subagents/runtime.ts');
  await f.agent.generate('Initialize.', runOptions());
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  let started = false,
    closed = false,
    calls = 0;
  f.setHandler(body => {
    if (!childRequest(body)) return { text: 'Lead acknowledged.' };
    if (++calls === 1)
      return {
        block: true,
        started: () => {
          started = true;
        },
        closed: () => {
          closed = true;
        },
      };
    return { text: 'RESUMED-COMPLETE' };
  });
  await f.tree.runtime.spawn(actor, {
    name: 'worker',
    description: 'Background task',
    prompt: 'STARTED-PROMPT',
  });
  await until(() => started);
  let child = (await f.treeStore.read('alice', 'alice-thread')).children[0];
  const childActor = await f.tree.runtime.actor(childContext(actor), child.id);
  await assert.rejects(
    f.tree.runtime.spawn(childActor, {
      name: 'grandchild',
      description: 'No',
      prompt: 'No',
    }),
    /MAX_DEPTH_REACHED/,
  );
  await assert.rejects(f.tree.runtime.interrupt(childActor, 'lead'), /UNAUTHORIZED/);
  await assert.rejects(f.tree.runtime.actor(context('bob'), 'alice-thread'), /UNAUTHORIZED/);
  await assert.rejects(f.tree.runtime.message(actor, 'foreign-child', 'No'), /UNAUTHORIZED/);
  await f.tree.runtime.interrupt(actor, 'worker');
  await until(() => closed);
  await f.tree.runtime.message(actor, 'worker', 'CONTINUE-WITH-NEW-DETAIL');
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  child = (await f.treeStore.read('alice', 'alice-thread')).children[0];
  assert.equal(child.result, 'RESUMED-COMPLETE');
  assert.equal(child.id, childActor.self);
  assert.ok(JSON.stringify(f.requests.filter(childRequest).at(-1).messages).includes('CONTINUE-WITH-NEW-DETAIL'));
});

test('cold restoration recovers expired work with a fresh authenticated owner', async t => {
  const f = await fixture(t);
  const { context } = await import('./tool-fixture.mjs');
  const { createAgentTree } = await import('../src/mastra/subagents/agents.ts');
  await f.agent.generate('Initialize.', runOptions());
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  await f.tree.runtime.close();
  const id = 'cold-worker-thread';
  await f.memoryStore.saveThread({
    thread: {
      id,
      title: 'Cold worker',
      resourceId: 'altflow-subagent:["alice","alice-thread"]',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    },
  });
  await f.treeStore.edit('alice', 'alice-thread', tree => {
    tree.children.push({
      id,
      name: 'worker',
      parent: actor.root,
      description: 'Recover',
      prompt: 'Original',
      state: 'running',
      generation: 1,
      lease: 0,
      forked: false,
    });
  });
  const restored = createAgentTree({
    store: f.treeStore,
    memory: f.memoryStore,
    childMemory: f.memory,
    model: f.model,
    tools: f.bundle.tools,
    teamEnabled: async () => false,
    getMastra: () => f.mastra,
  });
  t.after(() => restored.runtime.close());
  f.setHandler(body => (childRequest(body) ? { text: 'RECOVERED-AFTER-RESTART' } : { text: 'Root restored' }));
  await restored.runtime.attach(actor, f.agent);
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  assert.equal((await f.treeStore.read('alice', 'alice-thread')).children[0].result, 'RECOVERED-AFTER-RESTART');
});

test('capacity admission is atomic at eight children and cancellation frees a slot', async t => {
  const f = await fixture(t);
  const { context } = await import('./tool-fixture.mjs');
  await f.agent.generate('Initialize.', runOptions());
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  f.setHandler(body =>
    JSON.stringify(body.messages.find(m => m.role === 'system')).includes('Your name is worker-')
      ? { block: true, started() {}, closed() {} }
      : { text: 'Lead ready.' },
  );
  const results = await Promise.allSettled(
    Array.from({ length: 9 }, (_, i) =>
      f.tree.runtime.spawn(actor, {
        name: `worker-${i}`,
        description: 'Capacity',
        prompt: 'Wait for work.',
      }),
    ),
  );
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 8);
  assert.match(results.find(row => row.status === 'rejected').reason.message, /ACTIVATION_LIMIT_REACHED/);
  await f.tree.runtime.interrupt(actor, 'worker-0');
  await f.tree.runtime.spawn(actor, {
    name: 'replacement',
    description: 'Reused slot',
    prompt: 'Complete.',
  });
  assert.equal((await f.treeStore.read('alice', 'alice-thread')).children.length, 9);
  const stopped = (await f.treeStore.read('alice', 'alice-thread')).children.find(child => child.name === 'worker-0');
  await assert.rejects(
    f.tree.runtime.promptChild(actor, stopped.id, 'REJECTED-DIRECT-INPUT'),
    /ACTIVATION_LIMIT_REACHED/,
  );
  const snapshot = await f.tree.runtime.snapshot(actor, stopped.id);
  assert.ok(!snapshot.messages.some(message => message.text === 'REJECTED-DIRECT-INPUT'));
  assert.equal(
    (await f.treeStore.read('alice', 'alice-thread')).children.find(child => child.id === stopped.id).state,
    'interrupted',
  );
});

test('wait_agent wakes promptly for user steering while preserving signal delivery', async t => {
  const f = await fixture(t);
  let first = true;
  f.setHandler(body => {
    if (first) {
      first = false;
      return { calls: [{ name: 'wait_agent', args: { timeout_ms: 10000 } }] };
    }
    return {
      text: JSON.stringify(body.messages).includes('USER-STEERING') ? 'STEERING-RECEIVED' : 'NO-STEERING',
    };
  });
  const stream = await f.agent.stream('Wait for my next instruction.', runOptions());
  const consuming = stream.consumeStream();
  await until(() => f.requests.length === 1);
  await delay(100);
  const received = f.agent.sendSignal(
    { type: 'user', contents: 'USER-STEERING' },
    { threadId: 'alice-thread', resourceId: 'altflow:alice' },
  );
  await received.accepted;
  const steeringAt = Date.now();
  await consuming;
  assert.ok(Date.now() - steeringAt < 2000, 'User steering must wake wait_agent before its 10-second timeout');
  assert.equal(await stream.text, 'STEERING-RECEIVED');
});

test('provider failure releases dynamic capacity and allows a replacement child', async t => {
  const f = await fixture(t);
  const { context } = await import('./tool-fixture.mjs');
  await f.agent.generate('Initialize.', runOptions());
  const actor = await f.tree.runtime.actor(context('alice'), 'alice-thread');
  f.setHandler(body => (childRequest(body) ? { status: 401 } : { text: 'Failure recorded' }));
  await f.tree.runtime.spawn(actor, {
    name: 'worker',
    description: 'Failure case',
    prompt: 'Work',
  });
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'failed');
  f.setHandler(() => ({ text: 'Recovered child' }));
  await f.tree.runtime.message(actor, 'worker', 'Retry after provider recovery');
  await until(async () => (await f.treeStore.read('alice', 'alice-thread')).children[0]?.state === 'completed');
  assert.equal((await f.treeStore.read('alice', 'alice-thread')).children[0].result, 'Recovered child');
});
