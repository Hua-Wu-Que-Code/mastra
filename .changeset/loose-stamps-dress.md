---
'@mastra/playground-ui': minor
---

Added DSH-style conversation process disclosure, message timestamps, and clickable turn, session and context statistics. Statistics use recorded model usage and preserve unknown fields.

```tsx
import { ChatMetricsProvider, ChatSessionStats } from '@mastra/playground-ui/domains/chat';

<ChatMetricsProvider messages={messages} running={running} agentId={agentId} threadId={threadId}>
  <ChatSessionStats contextWindow={1048576} route="altflow/deepseek-v4-pro" />
</ChatMetricsProvider>;
```
