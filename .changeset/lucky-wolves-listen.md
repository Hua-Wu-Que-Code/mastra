---
'@mastra/playground-ui': minor
---

Added conversation font size and work-detail display preferences.

Place the settings and transcript under one provider, keyed by account identity, to share browser-local preferences:

```tsx
import {
  ChatPreferencesProvider,
  ChatPreferencesSettings,
  WorkDetails,
  WorkDetailsToggle,
} from '@mastra/playground-ui/domains/chat';

<ChatPreferencesProvider key={accountId} scope={accountId}>
  <ChatPreferencesSettings />
  <WorkDetails messages={messages} running={isRunning} latest={isLatestTurn}>
    <WorkDetailsToggle />
    {transcript}
  </WorkDetails>
</ChatPreferencesProvider>;
```
