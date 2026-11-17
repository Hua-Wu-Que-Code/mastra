---
'@mastra/playground-ui': patch
'@mastra/react': patch
---

Add account-scoped busy-send preferences to Studio. Queue messages for a subsequent
run or steer the active run with Enter and Cmd/Ctrl+Enter, without cancelling other
pending admissions or changing the active run identity. Default Studio tool
execution to no approval while honoring explicit agent and tool approval rules.
