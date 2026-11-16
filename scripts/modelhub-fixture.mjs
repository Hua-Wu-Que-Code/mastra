import { createServer } from 'node:http';
export const catalogFixture = () => ({
  config_version: 1,
  free_chat_models: [
    {
      id: 'deepseek-v4-pro',
      display_name: 'DeepSeek V4 Pro',
      sort_order: 1,
      default_thinking_level: 'off',
      thinking_options: [
        {
          level: 'off',
          target: 'internal-deepseek-route',
          supports_thinking_level: false,
          supports_thinking_budget: false,
        },
      ],
    },
    {
      id: 'qwen3.8-max',
      display_name: 'Qwen3.8 Max',
      sort_order: 2,
      default_thinking_level: 'high',
      thinking_options: [
        {
          level: 'high',
          target: 'internal-qwen-route',
          supports_thinking_level: true,
          supports_thinking_budget: true,
          agent_budget_tokens: 8000,
        },
      ],
    },
  ],
});
export async function modelHubFixture() {
  const state = { catalog: catalogFixture(), requests: [], catalogs: 0, unavailable: false };
  const server = createServer(async (request, response) => {
    if (request.url === '/v1/model-catalog') {
      state.catalogs++;
      response.writeHead(state.unavailable ? 503 : 200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(state.catalog));
    } else if (request.url === '/v1/chat/completions') {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      state.requests.push({ body: JSON.parse(raw), authorization: request.headers.authorization });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          id: 'test-completion',
          object: 'chat.completion',
          created: 1,
          model: 'test',
          choices: [{ index: 0, message: { role: 'assistant', content: 'verified' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    state,
    baseURL: `http://127.0.0.1:${server.address().port}/v1`,
    close: () => new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
  };
}
