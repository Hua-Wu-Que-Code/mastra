---
'@mastra/playground-ui': minor
---

Added account-scoped editor preferences for plain text mode, context visibility, send shortcuts, and follow-up handling in Studio settings.

Use `EditorPreferencesSettings` inside a `ChatPreferencesProvider` to expose the controls:

```tsx
<ChatPreferencesProvider scope={accountId}>
  <EditorPreferencesSettings />
</ChatPreferencesProvider>
```
