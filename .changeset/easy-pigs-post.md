---
"@mastra/altflow-tools": minor
---

Added account-scoped web search, conversation search, and file delivery tools for creator agents. See the package README for tool factory examples.

```ts
import { createWebSearchTool, createTavilyProvider } from '@mastra/altflow-tools';

const webSearch = createWebSearchTool({
  provider: createTavilyProvider({ apiKey: process.env.TAVILY_API_KEY! }),
});
// Register as Agent.tools.web_search only when the server key is configured.
```
