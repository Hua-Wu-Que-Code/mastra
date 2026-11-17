import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ModelHubGateway } from '../src/mastra/modelhub-gateway.ts';
import { modelHubFixture } from './modelhub-fixture.mjs';

test('ModelHub catalog drives listing and real SDK request routing, including cached instances', async (t) => {
  const hub = await modelHubFixture();
  t.after(hub.close);
  const gateway = new ModelHubGateway({ apiKey: 'server-test-key', baseURL: hub.baseURL });
  const providers = await gateway.fetchProviders();
  assert.deepEqual(Object.keys(providers), ['altflow']);
  assert.deepEqual(providers.altflow.models, ['deepseek-v4-pro', 'qwen3.8-max']);
  assert.equal(JSON.stringify(gateway).includes('server-test-key'), false);
  await assert.rejects(gateway.resolveLanguageModel({ modelId: 'gpt-external' }));
  const model = await gateway.resolveLanguageModel({ modelId: 'qwen3.8-max' });
  const generate = () =>
    model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
      providerOptions: { altflow: { reasoning_effort: 'wrong', modelhub_thinking_budget: 99 } },
    });
  await generate();
  assert.equal(hub.state.requests[0].authorization, 'Bearer server-test-key');
  assert.equal(hub.state.requests[0].body.model, 'internal-qwen-route');
  assert.equal(hub.state.requests[0].body.modelhub_reasoning_effort, 'high');
  assert.equal(hub.state.requests[0].body.modelhub_thinking_budget, 8000);
  assert.equal('reasoning_effort' in hub.state.requests[0].body, false);
  assert.equal(hub.state.requests[0].body.metadata.modelhub_product_model, 'qwen3.8-max');
  assert.equal(hub.state.catalogs, 1);
  const now = Date.now();
  t.mock.timers.enable({ apis: ['Date'], now });
  t.mock.timers.setTime(now + 60001);
  hub.state.catalog.config_version = 2;
  hub.state.catalog.free_chat_models[1].thinking_options[0].target = 'new-qwen-route';
  await generate();
  assert.equal(hub.state.requests[1].body.model, 'new-qwen-route');
  assert.equal(hub.state.requests[1].body.metadata.modelhub_catalog_version, '2');
  t.mock.timers.setTime(Date.now() + 60001);
  hub.state.unavailable = true;
  await generate();
  assert.equal(hub.state.requests[2].body.model, 'new-qwen-route', 'temporary failure retains validated snapshot');
});

test('invalid or unavailable first catalog fails closed', async (t) => {
  const hub = await modelHubFixture();
  t.after(hub.close);
  for (const corrupt of [
    (catalog) => {
      catalog.free_chat_models = [];
    },
    (catalog) => {
      catalog.free_chat_models.push(catalog.free_chat_models[0]);
    },
    (catalog) => {
      catalog.free_chat_models[0].default_thinking_level = 'missing';
    },
  ]) {
    const original = structuredClone(hub.state.catalog);
    corrupt(hub.state.catalog);
    await assert.rejects(new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL }).fetchProviders());
    hub.state.catalog = original;
  }
  hub.state.unavailable = true;
  await assert.rejects(new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL }).fetchProviders());
  assert.throws(() => new ModelHubGateway({ apiKey: 'test-key', baseURL: 'http://untrusted.example/v1' }));
});

test('catalog publishes names and supported reasoning; a selected level controls the upstream route', async (t) => {
  const hub = await modelHubFixture();
  t.after(hub.close);
  hub.state.catalog.free_chat_models[1].thinking_options.push({
    level: 'off',
    target: 'qwen-no-thinking',
    supports_thinking_level: false,
    supports_thinking_budget: false,
  });
  const gateway = new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL });
  const providers = await gateway.fetchProviders();
  assert.equal(providers.altflow.modelNames['qwen3.8-max'], 'Qwen3.8 Max');
  assert.deepEqual(providers.altflow.modelReasoning['qwen3.8-max'], {
    defaultLevel: 'high',
    levels: ['high', 'off'],
    contextWindows: { high: 131072 },
  });
  const model = await gateway.resolveLanguageModel({ modelId: 'qwen3.8-max' });
  const generate = (level) =>
    model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
      providerOptions: { altflow: { reasoningLevel: level } },
    });
  await generate('off');
  assert.equal(hub.state.requests[0].body.model, 'qwen-no-thinking');
  assert.equal(hub.state.requests[0].body.metadata.modelhub_thinking_level, 'off');
  assert.equal('modelhub_reasoning_effort' in hub.state.requests[0].body, false);
  assert.equal('modelhub_thinking_budget' in hub.state.requests[0].body, false);
  assert.equal('reasoningLevel' in hub.state.requests[0].body, false);
  await generate('high');
  assert.equal(hub.state.requests[1].body.modelhub_thinking_budget, 8000);
  await assert.rejects(generate('unsupported'), /reasoning level/);
  assert.equal(hub.state.requests.length, 2);
});

test('model/info supplies exact per-reasoning route capacities without guessing output limits as context', async (t) => {
  const hub = await modelHubFixture();
  t.after(hub.close);
  hub.state.catalog.free_chat_models[1].thinking_options.push({
    level: 'off',
    target: 'qwen-no-thinking',
    supports_thinking_level: false,
    supports_thinking_budget: false,
  });
  hub.state.info.data.push(
    { model_name: 'qwen-no-thinking', model_info: { max_input_tokens: 991808, context_window: 1048576 } },
    { model_name: 'internal-qwen-route', model_info: { max_input_tokens: 1048576 } },
  );
  const gateway = new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL });
  const { altflow } = await gateway.fetchProviders();
  assert.equal(altflow.modelContextWindows['deepseek-v4-pro'], 131072);
  assert.equal(altflow.modelContextWindows['qwen3.8-max'], 131072);
  assert.deepEqual(altflow.modelReasoning['qwen3.8-max'].contextWindows, { high: 131072, off: 131072 });
  await gateway.fetchProviders();
  assert.equal(hub.state.infos, 1);
});

test('missing or unavailable model/info never fabricates a context capacity or blocks chat', async (t) => {
  const hub = await modelHubFixture();
  t.after(hub.close);
  hub.state.info.data = [{ model_name: 'internal-deepseek-route', model_info: { max_output_tokens: 131072 } }];
  const missing = await new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL }).fetchProviders();
  assert.deepEqual(missing.altflow.modelContextWindows, {});
  hub.state.infoStatus = 403;
  const gateway = new ModelHubGateway({ apiKey: 'test-key', baseURL: hub.baseURL });
  const unavailable = await gateway.fetchProviders();
  assert.deepEqual(unavailable.altflow.modelContextWindows, {});
  assert.equal((await gateway.resolveLanguageModel({ modelId: 'deepseek-v4-pro' })).modelId, 'deepseek-v4-pro');
});


test('gateway caps output for every call while retaining the physical model/info limit', async t => {
  const hub = await modelHubFixture(); t.after(hub.close);
  const gateway = new ModelHubGateway({ apiKey: 'test', baseURL: hub.baseURL });
  assert.equal((await gateway.modelInfo())['internal-deepseek-route'], 1048576);
  const model = await gateway.resolveLanguageModel({ modelId: 'deepseek-v4-pro' });
  await model.doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }], maxOutputTokens: 64000 });
  assert.equal(hub.state.requests.at(-1).body.max_tokens, 8192);
  await model.doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }], maxOutputTokens: 100 });
  assert.equal(hub.state.requests.at(-1).body.max_tokens, 100);
});
