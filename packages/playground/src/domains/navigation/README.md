# Conversation projects

The sidebar and `/chat/:agentId/projects/:projectId` share project organization
through React Query. The authenticated server owns project names, membership,
project/chat pins, and collapsed sections. The custom `/conversation-projects`
GET/POST endpoint is mounted at the server root, outside Mastra's reserved API
prefix; standalone Studio proxies it alongside `/account` and `/storage`.

The browser submits commands rather than replacing the account document. The
server authenticates every request, validates chat ownership, and applies commands
against the latest stored state under a write transaction. Successful responses
update the account-scoped cache; failed writes leave the dialog open and show an
error. A project is not displayed as created before the server saves it.

For existing installations, the hook imports only the exact old localStorage key
for the active server, API prefix, and account. Import checks chat ownership,
preserves existing server records, and records a fingerprint to prevent the same
stale backup from resurrecting deleted projects. The browser backup is removed
only after successful import. Invalid backups do not block server reads. No
unscoped or other-account browser records are imported.

The project homepage reuses the chat composer, including attachments, model
selection, streaming, and draft recovery. Each project has a separate unsent draft.
After the server creates a chat, its ID joins the project before the page navigates
to the regular conversation URL. Sidebar new-chat actions keep that project context.

Sources are the union of files referenced by the project's readable chats. The
full paginated message history establishes file provenance; a user's workspace
listing alone never adds a file to a project. File previews and downloads reuse
the conversation file components.

Project deletion requires confirmation. The server reads the authoritative member
list, validates ownership before deleting any chat, and deletes archived members
too. Partial failure persists the remaining members for retry. The project is
removed only after all member deletions succeed. Workspace files retain their
existing storage lifecycle and are not deleted by this operation.

The AltFlow Agent service persists this metadata in `data/conversation-projects.db`.
Deployments must persist and back up this ledger alongside conversation storage.
Multiple application instances must share the same ledger rather than use
independent local files. No account database migration is required.
