---
'@mastra/core': patch
'@mastra/server': patch
'@mastra/client-js': patch
'@mastra/react': patch
'@mastra/playground-ui': patch
---

Show queued chat messages beside the composer until consumption, with server-backed deletion, steering and reordering. Preserve queue identity and publish authoritative ordering across thread subscriptions. Authorize queue edits against the authenticated thread scope.
