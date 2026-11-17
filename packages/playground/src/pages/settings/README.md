# Studio settings

`/settings` opens a dedicated settings workspace with its own sidebar. The main
Studio navigation and rounded content frame are not rendered on this route.

- General contains language, appearance, conversation display preferences, and busy-send behavior.
  Appearance offers Light, Dark, and Follow system choices, using the app theme
  provider. Old `?section=appearance` links open the same consolidated page.
- Account and main sidebar links carry the current path, query and fragment in
  router state. Back to app returns there; a direct visit defaults to `/`.
- Connection settings remain available only when Studio is not managed by the
  Go account integration.
- Settings sidebar width and collapse preferences are stored separately from
  the main application sidebar.

Route behavior and settings persistence are covered by `index.test.tsx` and
`__tests__/settings-auth-revalidation.test.tsx` using the real providers and MSW.

Conversation display follows DSH's independent presentation settings:

- Font size is 10–22 px, initially 14 px. It affects message content, markdown,
  reasoning and tool output; navigation and message action controls keep their size.
- Compact groups process rows without live detail or settled reasoning previews.
  Standard adds live detail and reasoning previews. Detailed shows active work as
  individual rows and groups historical work. Fully expanded keeps process rows
  visible. Individual tool arguments and reasoning bodies still expand manually.
- Work details collapse after completion by default. On next message keeps the
  latest turn open until another user turn appears, including after reloading.
  Explicit manual expansion takes precedence. Focus inside work prevents automatic folding.
- Folded turns keep all replies by default; Final answer only hides intermediate
  prose. Expanding restores it. Errors, approvals, questions and unfinished calls
  remain visible. No setting changes stored messages, exports or model input.

The browser stores these preferences under
`mastra:chat-preferences:v1:<account-id>`. Account switches remount the preference
scope; unconnected Studio uses `local`. Other tabs synchronize via storage events.
These preferences survive reloads in the same browser; they do not synchronize
between devices. Unavailable storage falls back to the current page's memory.

The DSH reference is `packages/client/ui-chat/src/client/presentation-policy.ts`,
`transcript-view.ts`, and `ui-theme/src/theme-settings.ts` in deepseek-harness.

Busy-send behavior follows DSH's `submission-policy.ts`: Queue message is the
initial choice. During a run, Enter and the send button use that choice;
Cmd/Ctrl+Enter uses the opposite (Queue message / Steer agent). Shift+Enter and
IME composition retain their editing behavior. The empty busy composer keeps
its Stop button. This requires the thread-signals transport; older servers that
only support a single response stream retain Stop until the current response
finishes, rather than silently interrupting it.

Queue uses the server's `queue-message` admission to start a subsequent run;
Steer uses `send-message` to deliver new instructions to the active run. Queued
messages appear as pending turns through the thread subscription and survive
navigation while the server remains running. They are not a browser timer.
The SDK preserves the current run identity while accepting a future queued run
and does not cancel earlier pending submissions when another message is sent.

Tool execution defaults to `requireToolApproval: false`. Explicit agent/tool
approval rules still apply. Managed accounts use server execution defaults;
the fetch adapter strips model, system prompt, tool and processor overrides from both
message admission routes. It preserves bounded conversation memory choices and
teamwork selection; the server independently validates those fields and thread ownership.

`/settings/memory` contains an agent selector, a master memory switch, independent
working/observational memory switches, and the recent-message limit. Memory content
and observation analysis now live here, rather than over the conversation list.
Opening settings from a conversation retains its agent and thread through the
existing return path. A direct visit selects the first agent and its latest thread.
The working-memory editor and observation timeline retain their existing server APIs.

Choices are saved per account and agent in this browser. They apply to the next
submission, including idle and queued thread admissions. Memory off disables history,
semantic recall, working memory and observations for that invocation; it keeps stored
records available for inspection. It does not delete or erase conversations.
An empty recent-message limit selects Auto; zero disables history and a positive
integer caps its message count. DSH has no fixed recent-message-count setting: its
compaction-basic package retains recent messages within a token budget. The local
creator server uses that automatic budget/compaction policy; the optional count is
an additional Studio control.

The model menu follows DSH's `ui-agent-team/src/client/TeamModeToggle.tsx`: a team
settings pane explains delegation and contains the switch. New conversations start
with teamwork off; reopening a conversation restores its selection. A locked model
still allows changing teamwork. Turning it off omits configured sub-agent delegation
tools from subsequent executions and reconstructed tool sets; ordinary tools and
existing child conversations remain available. It does not attach new agents or
cancel running child tasks. The execution option is `disableSubAgents`.
