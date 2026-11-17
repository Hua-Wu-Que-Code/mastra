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
the fetch adapter strips execution overrides from both message admission routes,
and the server enforces thread ownership and rejects nested run configuration.
