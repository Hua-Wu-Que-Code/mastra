import type { GetMemoryConfigResponse } from '@mastra/client-js';
import { Badge } from '@mastra/playground-ui/components/Badge';
import { Button } from '@mastra/playground-ui/components/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@mastra/playground-ui/components/Collapsible';
import { DisclosureChevron } from '@mastra/playground-ui/components/DisclosureChevron';
import { KeyValueList } from '@mastra/playground-ui/components/KeyValueList';
import { Skeleton } from '@mastra/playground-ui/components/Skeleton';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMemoryConfig } from '@mastra/react/hooks/memory';
import { z } from 'zod';

interface MemoryConfigSection {
  title: string;
  items: Array<{ label: string; value: string | number | boolean }>;
}

const recallDisplayValueSchema = z.union([z.string(), z.number()]).optional().catch('Unavailable');

const semanticRecallDisplaySchema = z.object({
  scope: recallDisplayValueSchema,
  topK: recallDisplayValueSchema,
  messageRange: z.union([
    z.object({ before: recallDisplayValueSchema, after: recallDisplayValueSchema }),
    recallDisplayValueSchema,
  ]),
});

function formatRecallMessageRange(messageRange: z.infer<typeof semanticRecallDisplaySchema>['messageRange']) {
  if (typeof messageRange === 'string') return messageRange;
  const before = typeof messageRange === 'object' ? messageRange.before : messageRange;
  const after = typeof messageRange === 'object' ? messageRange.after : messageRange;
  return studioT('{before} before, {after} after', { before: before ?? 1, after: after ?? 1 });
}

function formatThreshold(threshold: number | { min: number; max: number } | undefined) {
  if (threshold === undefined) return 'Default';
  if (typeof threshold === 'number') return `${threshold.toLocaleString()} tokens`;
  return `${threshold.min.toLocaleString()}–${threshold.max.toLocaleString()} tokens`;
}

function getMemorySections(config: NonNullable<GetMemoryConfigResponse['config']>) {
  const sections: MemoryConfigSection[] = [
    {
      get title() {
        return studioT('General');
      },
      items: [
        {
          get label() {
            return studioT('Status');
          },
          value: true,
        },
        {
          get label() {
            return studioT('Last Messages');
          },
          value: config.lastMessages ?? 'Default',
        },
        {
          get label() {
            return studioT('Auto-generate Titles');
          },
          value: 'generateTitle' in config && Boolean(config.generateTitle),
        },
      ],
    },
  ];

  if (config.semanticRecall) {
    const semanticRecall = semanticRecallDisplaySchema.safeParse(
      config.semanticRecall === true ? {} : config.semanticRecall,
    );
    if (semanticRecall.success) {
      sections.push({
        get title() {
          return studioT('Semantic Recall');
        },
        items: [
          {
            get label() {
              return studioT('Status');
            },
            value: true,
          },
          {
            get label() {
              return studioT('Scope');
            },
            value: semanticRecall.data.scope ?? 'resource',
          },
          {
            get label() {
              return studioT('Top K Results');
            },
            value: semanticRecall.data.topK ?? 4,
          },
          {
            get label() {
              return studioT('Message Range');
            },
            value: formatRecallMessageRange(semanticRecall.data.messageRange),
          },
        ],
      });
    } else {
      sections.push({
        get title() {
          return studioT('Semantic Recall');
        },
        items: [
          {
            get label() {
              return studioT('Configuration');
            },
            value: 'Unavailable',
          },
        ],
      });
    }
  }

  const observationalMemory = config.observationalMemory;
  if (observationalMemory?.enabled) {
    sections.push({
      get title() {
        return studioT('Observational Memory');
      },
      items: [
        {
          get label() {
            return studioT('Status');
          },
          value: true,
        },
        {
          get label() {
            return studioT('Scope');
          },
          value: observationalMemory.scope ?? 'thread',
        },
        {
          get label() {
            return studioT('Message Tokens');
          },
          value: formatThreshold(observationalMemory.messageTokens),
        },
        {
          get label() {
            return studioT('Observation Tokens');
          },
          value: formatThreshold(observationalMemory.observationTokens),
        },
        ...(observationalMemory.observationModel
          ? [
              {
                get label() {
                  return studioT('Observation Model');
                },
                value: observationalMemory.observationModel,
              },
            ]
          : []),
        ...(observationalMemory.reflectionModel
          ? [
              {
                get label() {
                  return studioT('Reflection Model');
                },
                value: observationalMemory.reflectionModel,
              },
            ]
          : []),
      ],
    });
  }

  return sections;
}

function formatMemoryValue(value: string | number | boolean) {
  if (typeof value === 'boolean') return value ? studioT('Enabled') : studioT('Disabled');
  return value;
}

function MemoryConfigFields({ items }: Pick<MemoryConfigSection, 'items'>) {
  return (
    <KeyValueList
      className="grid-cols-2"
      data={items.map(item => ({
        key: item.label,
        label: (
          <Txt as="span" variant="body-sm">
            {item.label}
          </Txt>
        ),
        value: (
          <Badge
            variant={item.value === true ? 'success' : 'neutral'}
            indicator={typeof item.value === 'boolean' ? 'dot' : undefined}
            className="h-auto min-h-5 min-w-0 break-words whitespace-normal"
          >
            {formatMemoryValue(item.value)}
          </Badge>
        ),
      }))}
    />
  );
}

export function AgentMemoryConfig({ agentId }: { agentId: string }) {
  useLocale();
  const { data, isLoading, isError, isFetching, refetch } = useMemoryConfig({
    agentId: agentId,
    requestContext: useEntityRequestContext('agent', agentId)[0],
    queryOptions: { enabled: Boolean(agentId) },
  });

  if (isLoading) return <Skeleton className="h-28 w-full" />;

  if (isError && !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <Txt variant="caption" tone="muted">
          {studioT('Unable to load memory configuration')}
        </Txt>
        <Button size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {studioT('Retry')}
        </Button>
      </div>
    );
  }

  if (!data?.config)
    return (
      <Txt variant="caption" tone="muted">
        {studioT('No memory configuration available')}
      </Txt>
    );

  return (
    <div className="flex flex-col gap-3">
      {getMemorySections(data.config).map(section =>
        section.title === 'General' ? (
          <MemoryConfigFields key={section.title} items={section.items} />
        ) : (
          <Collapsible key={section.title} defaultOpen={section.title !== 'Observational Memory'}>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2">
              <Txt as="span" variant="body-sm">
                {section.title}
              </Txt>
              <DisclosureChevron direction="right" className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <MemoryConfigFields items={section.items} />
            </CollapsibleContent>
          </Collapsible>
        ),
      )}
    </div>
  );
}
