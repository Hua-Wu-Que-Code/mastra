---
'@mastra/core': minor
---

Added an execution option to disable configured sub-agent delegation while retaining ordinary tools and existing child conversations.

```ts
await agent.stream(messages, { disableSubAgents: true });
```
