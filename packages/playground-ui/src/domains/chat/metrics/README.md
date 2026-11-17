# Conversation statistics

Select the gauge, token count or context ring below the composer to open its
statistics card. Select a reply's token count to inspect that turn by model.
Cards open on click, close on Escape or outside interaction, and use the shared
Studio popover for keyboard focus and viewport collision handling.

## Data sources

`ChatMetricsProvider` requests all trace pages for the current agent and thread,
then reads each trace through `MastraClient`. It also includes trace IDs from
message metadata, so current runs do not wait for the history index. If the
history endpoint is unavailable, only loaded message traces can contribute, and
the cards identify the statistics as partial.
The active trace refreshes while running and after completion to allow for
observability persistence delays. No calls are made to the model for these cards.

Accounting counts each provider inference once. Its generation and step ancestors
can repeat the same usage and are excluded. Older traces with generation usage
and no inference child remain supported. Unknown usage fields remain unknown.

The gauge card reports agent runs, model steps, model time, tool time, average
time to first token and output tokens per second. Output speed excludes the wait
for the first token. The token card sums provider input and output counts; cache
reads and reasoning are subsets, not additional tokens. Cache-hit percentages
never round a partial hit to 100%.
Provider token totals include auxiliary calls such as thread titles. Context
occupancy uses the root run's first-chunk attribution to select its own model
loop, so a later title or processor request cannot replace the conversation sample.

## Context budget

Custom gateways can include `modelContextWindows` in their provider catalog:

```ts
import type { ProviderConfig } from '@mastra/core/llm';

const provider: ProviderConfig = {
  name: 'AltFlow',
  gateway: 'altflow',
  apiKeyEnvVar: 'ALTFLOW_MODELHUB_API_KEY',
  models: ['deepseek-v4-pro'],
  modelContextWindows: { 'deepseek-v4-pro': 1048576 },
};
```

Publish the gateway-declared input context limit, never a guessed local budget
or the maximum output size. When reasoning levels route to different models,
`modelReasoning[modelId].contextWindows` maps each level to its declared input
limit. Missing levels remain unknown; Studio does not reuse the default route
capacity for them. The ring is hidden until a matching request sample and its
capacity are available.

Context occupancy divides the latest main-loop request's actual input token count
by that input limit, rather than using cumulative session tokens. The DSH context card shows the actual input total and declared capacity in its
header (full counts are exposed in its accessible meter label). Its grey, purple
and blue legend identifies system prompts, tool definitions and conversation
messages. ModelHub currently returns aggregate input usage only: each unavailable
component count says "Not provided", and the occupancy bar uses a neutral fill
until a measured breakdown is available. It does not estimate composition from
character lengths or assign the aggregate to a single component.

## Message boundaries

A steer can create several user messages within one run. The final assistant
message owns that run's usage once. Process folding keeps errors, pending approval
and unfinished tools visible. Conversation branching copies every history page
up to the selected reply and excludes later messages.

The adapted design and artwork are documented in
[the third-party notice](../../../../notices/DeepSeek-Harness.md).

## Work process

Opening the turn header reveals the ordered reasoning and tool rows immediately
(except Compact mode, which initially folds the inner group). Each row keeps its
own disclosure state and full original content. Completed groups summarize their
top three tool categories, ranked by distinct call count; streaming groups show
the active operation. Reasoning previews use the first line, or the last completed
paragraph while streaming. Tool previews use DSH's argument priority, starting
with title and description. Expanded content, approval actions, errors and
background-task controls retain their existing behavior. The process glyphs and
chevrons use DSH's original regular SVG artwork.
