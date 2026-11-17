# Hover hints

Studio does not display hover hints or preview cards. The shared Tooltip, HoverCard and chart tooltip components retain their API for existing callers but never open visual content. Triggers still preserve click actions, links and keyboard behavior.

Use visible text or an accessible name for controls. Do not add native HTML `title` attributes or SVG `<title>` hints. An iframe title still names its embedded document and is retained.

`TooltipContent` only retains screen-reader-only content when both `keepMounted` and an explicit `id` are supplied, supporting existing `aria-describedby` relationships. `InfoTooltip` renders nothing. Icon buttons retain plain-text tooltip props as accessible names.
