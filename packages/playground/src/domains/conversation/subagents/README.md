# Conversation lineage and subagents

The conversation header displays the server's saved title. A non-empty subagent list opens a standard Popover with task descriptions, names, states, actual token totals and elapsed time. Children are addressed by `?child=<id>` on the existing root chat route. Returning to the root preserves the main ChatProvider and its active stream.

`GET /altflow/subagents?root=…&child=…&page=…` returns account-authorized projections. The root snapshot supplies the title, children and optional shared tasks; child snapshots include bounded pages of saved messages. Queries include server, authentication headers, account, root and child identity. Switching conversations never reuses another tree's cached snapshot.

POST uses `{action:"prompt",prompt}` or `{action:"interrupt"}`. The server checks root ownership, child membership, origin and body size. A failed mutation keeps the composer text for retry. Neither the browser nor the model supplies a child resource/account identity.

No child menu appears for an empty tree. Missing provider usage displays “Not provided”. Shared tasks appear only when teamwork is enabled and the board is non-empty. Persistent business state is stored by the runtime; URL selection and open popovers are view state.
