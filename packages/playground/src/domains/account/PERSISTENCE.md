# Account data persistence audit

Managed Altflow sessions use authenticated server storage as the source of truth.
Browser caches may be cleared without deleting saved account data.

| Data                                               | Source of truth                                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Projects, project membership, chat/project pins    | `/conversation-projects`, server LibSQL ledger                                                             |
| Chats, titles, archive state, messages             | Mastra memory storage                                                                                      |
| Memory opt-out                                     | `/account-preferences`, additionally enforced by the Agent memory resolver                                 |
| Thread model, reasoning and execution settings     | `/account-preferences`, keyed by account + agent + thread                                                  |
| Agent editor execution settings                    | `/account-preferences`, keyed by account + agent                                                           |
| Chat font, work-detail display, composer behavior  | `/account-preferences`, keyed by account                                                                   |
| Uploaded/generated files, source files, task state | Authenticated file ledger and server tools/memory                                                          |
| Saved observability views                          | Local SavedViews primitive has no production consumers; hosted API is used when the host supplies a source |

`account-preferences` merges changed fields transactionally. Accounts cannot choose
another owner. Existing threads are checked against the authenticated resource.
An uncreated thread may have an account-owned preference entry before first send.
Legacy thread overrides import only after ownership of the existing thread is
verified. Exact account keys for memory/chat preferences are imported once. Empty
server entries created by a reset still win over stale browser backups. Failed
imports retain the local backup. Unattributed agent editor settings and old pins
are not silently assigned to whichever account logs in next.

Local storage intentionally retains device language/theme, panel dimensions,
open/closed state, column ordering and last-used filters. Request/tracing form
inputs are unsent drafts, scoped by server + account. Composer text and pending
attachment blobs are local recovery drafts, already scoped by server + account +
agent + thread, bounded by age/count/size; they are not uploaded before submission.

Connection URLs/API prefixes are device configuration. Custom connection headers
stay in memory only, including Authorization, API keys and arbitrary custom names.
Opening either native connection settings or a managed account removes headers
from old persisted connection records. Managed sessions ignore saved connection
credentials and use HttpOnly account cookies.

The generic playground-ui components retain explicit local storage support for
standalone hosts without an Altflow account service. The managed app supplies
controlled server values. Tests cover fresh query clients, cleared local storage,
failed saves/imports, account isolation, server restart and concurrent edits.
