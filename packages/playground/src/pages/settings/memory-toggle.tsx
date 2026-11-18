import { Button } from '@mastra/playground-ui/components/Button';
import { Switch } from '@mastra/playground-ui/components/Switch';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { t } from '@mastra/playground-ui/lib/i18n';
import { SettingsRow } from '@mastra/playground-ui/new/settings';
import { useAgents } from '@mastra/react/hooks/agents';
import { useMemory } from '@mastra/react/hooks/memory';
import { useAgentMemoryPreferences } from '@/domains/agents/context/agent-memory-preferences';

export function MemoryToggle() {
  const { data: agents, isLoading, isError } = useAgents();
  const agentId = Object.keys(agents ?? {})[0];
  if (agentId) return <AgentMemoryToggle key={agentId} agentId={agentId} />;
  return (
    <SettingsRow
      label={t('Enable memory')}
      description={t('Remember important information from conversations for future replies.')}
    >
      <Txt tone="muted">
        {isLoading ? t('Loading...') : isError ? t('Unable to load agents.') : t('Memory not enabled')}
      </Txt>
    </SettingsRow>
  );
}

function AgentMemoryToggle({ agentId }: { agentId: string }) {
  const [preferences, setPreferences, saved] = useAgentMemoryPreferences(agentId);
  const [requestContext] = useEntityRequestContext('agent', agentId);
  const { data: status, isLoading } = useMemory({ agentId, requestContext });
  return (
    <SettingsRow
      label={t('Enable memory')}
      description={t('Remember important information from conversations for future replies.')}
    >
      {saved.error && (
        <Button type="button" variant="ghost" onClick={saved.retry}>
          {t('Retry')}
        </Button>
      )}
      <Switch
        aria-label={t('Enable memory')}
        checked={preferences.enabled !== false && Boolean(status?.result)}
        disabled={isLoading || saved.isLoading || saved.isSaving || Boolean(saved.error) || !status?.result}
        onCheckedChange={enabled => setPreferences({ enabled })}
      />
    </SettingsRow>
  );
}
