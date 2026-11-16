import type { GetAgentResponse } from '@mastra/client-js';
import { Button } from '@mastra/playground-ui/components/Button';
import { CardTitle } from '@mastra/playground-ui/components/Card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@mastra/playground-ui/components/HoverCard';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { AgentIcon } from '@mastra/playground-ui/icons/AgentIcon';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useId } from 'react';

export interface AgentSubagentDetailsProps {
  agentName: string;
  agents?: GetAgentResponse['agents'];
}

function formatAgentCount(count: number) {
  return `${count} agent${count === 1 ? '' : 's'}`;
}

export function AgentSubagentDetails({ agentName, agents }: AgentSubagentDetailsProps) {
  useLocale();
  const titleId = useId();
  const agentEntries = Object.entries(agents ?? {});

  if (agentEntries.length === 0) return null;

  const agentCount = formatAgentCount(agentEntries.length);

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="pointer-events-auto"
            aria-label={studioT('Show {value0} for {value1}', { value0: agentCount, value1: agentName })}
            icon={<AgentIcon aria-hidden="true" />}
          >
            <span>{agentEntries.length}</span>
          </Button>
        }
      />
      <HoverCardContent
        role="dialog"
        aria-labelledby={titleId}
        side="top"
        align="center"
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <div className="grid gap-3">
          <CardTitle id={titleId}>{studioT('Agents')}</CardTitle>
          <ul
            aria-label={studioT('Configured agents for {value0}', { value0: agentName })}
            className="grid max-h-64 gap-2 overflow-y-auto"
            tabIndex={0}
          >
            {agentEntries.map(([agentKey, agent]) => (
              <li key={agentKey} className="overflow-wrap-anywhere text-foreground">
                <Txt as="span" variant="column" className="block">
                  {agent.name || agent.id || agentKey}
                </Txt>
              </li>
            ))}
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
