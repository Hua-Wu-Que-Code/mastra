The conversation process header, message clocks, usage click cards, context meter,
cache-hit formatting and session accounting adapt DeepSeek Harness:

- `ui-chat/src/client/chat/TurnProcessNodeView.tsx`, `MessageIconActions.tsx`,
  `TurnUsagePanel.tsx`, `StatsPills.tsx`, `token-format.ts` and `message-chrome.ts`.
- `ui-chat/src/client/contract/turn-metrics.ts`.
- `ui-conversation/src/client/skeleton/ContextMeter.tsx` and `context-occupancy.ts`.
- `ui-chat/src/client/chat/ReasoningRow.tsx`, `ChatGroupSeat.tsx` and `step-process.ts`.
- The copy, database, gauge, branch, process category and disclosure SVG paths from `ui-primitives/src/icons/artwork.ts`.

These paths are relative to DSH's `packages/client/` directory. DeepSeek Harness is
distributed under the MIT license reproduced in
[DeepSeek-Harness-LICENSE.txt](./DeepSeek-Harness-LICENSE.txt).
