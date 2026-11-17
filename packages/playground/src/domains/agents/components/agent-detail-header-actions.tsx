import { Button } from '@mastra/playground-ui/components/Button';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useAgent } from '@mastra/react/hooks/agents';
import { AgentConfigToggle } from './agent-config-toggle';
import { useCanCreateAgent } from '@/domains/agent-builder/hooks/use-can-create-agent';

export interface AgentDetailHeaderActionsProps {
  agentId: string;
  showConfig?: boolean;
}

/** Edit / Config actions shown in the route header on every agent sub-page. */
export function AgentDetailHeaderActions({ agentId, showConfig = true }: AgentDetailHeaderActionsProps) {
  useLocale();
  const { data: agent } = useAgent({
    agentId: agentId,
    requestContext: useEntityRequestContext('agent', agentId)[0],
    queryOptions: { enabled: Boolean(agentId) },
  });
  const { canCreateAgent } = useCanCreateAgent();
  const { Link: FrameworkLink, paths } = useLinkComponent();

  const editPath = paths.cmsAgentEditLink(agentId);
  const showEditButton = canCreateAgent && agent?.source === 'stored' && Boolean(editPath);

  return (
    <>
      {showEditButton && (
        <Button variant="ghost" size="sm" render={<FrameworkLink href={editPath} />} icon={<IconPencil />}>
          {studioT('Edit')}
        </Button>
      )}
      {showConfig && <AgentConfigToggle />}
    </>
  );
}
