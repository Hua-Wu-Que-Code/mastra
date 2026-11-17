---
"@mastra/react": minor
---

Added onThreadTitleGenerated to useChat so applications can update conversation titles while viewing live or reconnected replies.

```tsx
useChat({
  agentId,
  threadId,
  onThreadTitleGenerated: ({ threadId, title }) => updateTitle(threadId, title),
});
```

Enable `memory.options.generateTitle.emitEvent` on stream requests to receive the saved title before completion.
