---
'@mastra/react': minor
---

Added conversation memory preferences and sub-agent selection to chat submissions and their continuation requests.

```ts
const { sendMessage } = useChat({ agentId, resourceId, threadId });
sendMessage({
  message: 'Continue with the latest notes',
  memoryOptions: { lastMessages: 20, workingMemory: { enabled: false } },
  disableSubAgents: true,
});
```
