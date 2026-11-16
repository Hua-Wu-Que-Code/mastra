import { useLinkComponent } from '@mastra/playground-ui/lib/framework';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { HeaderCreateAction } from '@/components/ui/header-create-action';
import { useCanCreateAgent } from '@/domains/agent-builder/hooks/use-can-create-agent';

/**
 * Renders the "Create agent" CTA in the page header of the agents
 * listing page. Kept here (not in the route handle) because it depends on a
 * hook that resolves auth/feature flags.
 */
export function AgentHeaderCreateAction() {
  useLocale();
  const { canCreateAgent } = useCanCreateAgent();
  const { paths } = useLinkComponent();
  const createPath = paths.cmsAgentCreateLink();
  if (!canCreateAgent || !createPath) return null;
  return (
    <HeaderCreateAction href={createPath} tooltip={studioT('Create an agent')}>
      {studioT('New agent')}
    </HeaderCreateAction>
  );
}
