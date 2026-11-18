# Studio settings

`/settings` opens a dedicated settings workspace with its own sidebar. The main
Studio navigation and rounded content frame are not rendered on this route.

- General is the first settings entry and contains language, appearance, the master memory switch, conversation display preferences, and an Editor section.
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

The Editor section groups plain text mode, context-window visibility, sending
shortcuts, and follow-up message handling. Plain text is initially enabled and
uses the existing textarea. Turning it off uses the shared Markdown code editor
with syntax highlighting. Both modes edit the same source text, preserve drafts,
and support attachments. This is a source editor, not a rich-text document editor.
Context-window visibility is initially enabled; hiding it removes only the context
ring and its popover, without changing model limits or other conversation statistics.
The sidebar no longer advertises the separate agent-configuration editor as a
message editor. Its tools, workflows, and processor capabilities remain available.

Busy-send behavior follows DSH's `submission-policy.ts`: Queue message is the
initial choice. The send button always uses the selected Queue or Steer behavior.
With the initial Enter shortcut, Enter sends and Cmd/Ctrl+Enter uses the opposite
behavior. With Cmd/Ctrl+Enter selected, Enter inserts a newline, Cmd/Ctrl+Enter
sends, and Cmd/Ctrl+Shift+Enter uses the opposite behavior. Shift+Enter and
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

General exposes a single **Enable memory** switch for the available Agent. There
is no Agent selector, per-feature switch, history limit, or conversation memory
inspector in settings. `/settings/memory` redirects to General while preserving
the return path.

The switch is saved per account and Agent in this browser and applies to the next
submission, including idle and queued admissions. Off disables history, semantic
recall, working memory and observations for that invocation without deleting saved
records. On follows the complete server memory policy. Retired per-feature browser
values are ignored, so a hidden old setting cannot continue disabling a feature.

Chat and Agent management have separate route layouts. New and recent conversations
use `/chat/:agentId/threads/:threadId`, including first-message persistence, reloads,
message links and branches. These pages omit breadcrumbs, management tabs and the
configuration panel. The Agents sidebar entry opens management: list/card links go
to the Agent traces page, and management retains breadcrumbs, testing chat, traces,
editor and configuration. Capability footers are removed from the global and legacy
conversation sidebars. Thread data and APIs retain their original IDs and ownership.

The model menu follows DSH's `ui-agent-team/src/client/TeamModeToggle.tsx`: a team
settings pane controls shared team tasks and coordination instructions. New conversations start
with teamwork off; reopening restores the server preference. Ordinary dynamic subagent
creation, forking, messaging, waiting and interruption remain available in either mode.
Disabling teamwork in a conversation with messages requires confirmation. Existing tasks,
child conversations and running work are preserved. This switch does not set `disableSubAgents`.

## Archived chats

The conversation menu includes Archive. Archived chats disappear from both Recent
and project lists without deleting their messages, pins, or project membership.
Archiving the open conversation returns to New chat.

`/settings/archived-chats` lists archived chats with Unarchive and Delete actions.
Unarchive returns the chat to its original sidebar location. Delete uses the same
permanent-deletion confirmation as the conversation menu; a failed request keeps
the dialog open for retry. Loading failures expose Retry instead of an empty list.

Archive state is stored in thread metadata as `altflowArchived`, through the
existing authenticated memory API. It survives reloads and browser changes.
Metadata is read immediately before updates to preserve other thread metadata.
Viewing, archiving, and deleting use the existing memory read, update, and delete
permissions. MSW tests cover persistence, restoration, deletion, errors, and
read-only access in `archived-chats.test.tsx` and the sidebar conversation tests.

## Account file storage

`/settings/storage` displays the authenticated user's server quota, documents, and
images, including Agent-generated files. The account integration provides
`GET /storage`, `POST /storage/upload`, `GET /storage/download`, and
`DELETE /storage/file`. The server authenticates each call and enforces quota;
the UI never supplies an owner ID or receives OSS credentials. Vite proxies
`/storage` to the configured API host.

Managed chat attachments are persisted before submitting the turn. Text and
other documents become workspace references, so long documents can be read
through file tools instead of filling the prompt with their entire contents.
Images and PDFs retain their native model input plus a hidden workspace reference.
Upload failures preserve the draft and expose the server's actionable error.
Unmanaged Studio connections keep the existing attachment transport.
