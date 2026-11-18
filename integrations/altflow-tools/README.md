# @mastra/altflow-tools

General tools for Altflow creator agents. This package uses public Mastra APIs and does not modify core.

- `web_search({ queries })`: one to ten queries, three HTTP requests in flight, URL deduplication, ten sources, bounded snippets, partial failures and cancellation. Tavily and DeepSeek providers expose the same model schema.
- `session_search({ query, limit })`: literal search of persisted user/assistant message text, including old conversations. The LibSQL adapter searches the current account's threads and excludes reasoning/tool payloads. `createdAt` is the matching message's time. Native Memory `recall` is separate.
- `present({ files })`: references up to eight existing private files through an injected delivery service. It does not copy files or allocate extra storage.

```ts
import { createWebSearchTool, createTavilyProvider } from '@mastra/altflow-tools';

const key = process.env.TAVILY_API_KEY;
const tools = key ? {
  web_search: createWebSearchTool({ provider: createTavilyProvider({ apiKey: key }) }),
} : {};
// Pass tools to Agent.tools. Do not register an unconfigured search tool.
```

For account tools, the host must authenticate requests and set `MASTRA_NORMALIZED_USER_KEY` and `MASTRA_RESOURCE_ID_KEY` in RequestContext. Also overwrite `ALTFLOW_ACCOUNT_RESOURCE_KEY` with the authenticated account resource on every request and reject caller-supplied `mastra__*` keys. Never accept account identity from model arguments. When delegating, carry that account scope to the child using `ALTFLOW_ACCOUNT_RESOURCE_KEY`; leave Mastra's native child Memory resource identity alone. The tool also requires an Agent execution context. Direct unscoped tool debugging is rejected.

`LibSQLSessionSearch` accepts a LibSQL client for the same database as Mastra Memory. It uses public storage table constants and parameterized read-only SQL. It does not create or migrate tables. Its query budget returns a timeout error; the underlying embedded SQLite query may finish after that deadline. Large deployments should provide an indexed `SessionSearchService` implementation with the same account boundary.

`createPresentTool` accepts a `DeliveryService`; verify ownership and file existence on every call. The Altflow app uses the same OSS-backed ledger as uploads and filesystem tools. The UI rechecks authorization at download time and uses the configured application host, never a model-provided URL.

## Search configuration in the Altflow app

| Variable | Purpose |
| --- | --- |
| `ALTFLOW_SEARCH_PROVIDER` | `tavily` (default) or `deepseek` |
| `TAVILY_API_KEY` | Tavily server credential |
| `TAVILY_SEARCH_URL` | Optional full Tavily search endpoint |
| `DEEPSEEK_SEARCH_API_KEY` | Separate DeepSeek search credential |
| `DEEPSEEK_SEARCH_URL` | Optional full DeepSeek search endpoint |

Only HTTPS is accepted except localhost fixture endpoints. Redirects are rejected. Never reuse a chat gateway credential against a different service. DeepSeek requests use DSH's response mapping, `need_content: false` and a shared five-request-per-second limiter. Unconfigured search is visible as such in the app catalog but absent from model requests.

## Local verification

```sh
pnpm --filter @mastra/altflow-tools test
pnpm --filter @mastra/altflow-tools typecheck
pnpm --filter @mastra/altflow-tools lint
pnpm --filter @mastra/altflow-tools build:lib
```

Tests use local HTTP sockets and a temporary LibSQL database. A real paid-provider call still requires its own credential. The companion creator app adds native task, question, plan, workspace, memory, knowledge, skill, workflow and delegation tools; these are not duplicate implementations in this package.
