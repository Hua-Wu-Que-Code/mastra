import { Button } from '@mastra/playground-ui/components/Button';
import { Input } from '@mastra/playground-ui/components/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mastra/playground-ui/components/Select';
import { Switch } from '@mastra/playground-ui/components/Switch';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { useEntityRequestContext } from '@mastra/playground-ui/domains/request-context/hooks/use-entity-request-context';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { SettingsContainer, SettingsGroup, SettingsLayout, SettingsRow } from '@mastra/playground-ui/new/settings';
import { useAgents } from '@mastra/react/hooks/agents';
import { useMemory, useMemoryConfig, useThread, useThreads } from '@mastra/react/hooks/memory';
import { useLocation, useSearchParams } from 'react-router';
import { SettingsWorkspace } from './settings-workspace';
import { AgentMemory } from '@/domains/agents/components/memory-sidebar/agent-memory';
import { MemoryDetailView } from '@/domains/agents/components/memory-sidebar/memory-detail-view';
import { MemoryTimelineProvider, ObservationalMemoryProvider, useMemoryTimeline } from '@/domains/agents/context';
import { useAgentMemoryPreferences } from '@/domains/agents/context/agent-memory-preferences';
import { WorkingMemoryProvider } from '@/domains/agents/context/agent-working-memory-context';
import { ThreadInputProvider } from '@/domains/conversation/context/ThreadInputContext';

function sourceConversation(state: unknown) {
  if (typeof state !== 'object' || state === null || !('returnTo' in state) || typeof state.returnTo !== 'string')
    return;
  const match = /^\/agents\/([^/]+)\/threads\/([^/?#]+)/.exec(state.returnTo);
  if (match) return { agentId: decodeURIComponent(match[1]), threadId: decodeURIComponent(match[2]) };
}

export function MemorySettingsPage() {
  useLocale();
  const { data: agents, isLoading, isError } = useAgents();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const source = sourceConversation(location.state);
  const entries = Object.entries(agents ?? {});
  const requestedAgent = params.get('agent') ?? source?.agentId;
  const agentId = entries.some(([id]) => id === requestedAgent) ? requestedAgent : entries[0]?.[0];
  const threadId = params.get('thread') ?? (source?.agentId === agentId ? source?.threadId : undefined);

  return (
    <SettingsWorkspace>
      <SettingsLayout title={t('Memory')}>
        <section className="space-y-6">
          <SettingsContainer>
            <SettingsRow label={t('Agent')} description={t('Manage memory for this agent.')}>
              <Select
                value={agentId ?? ''}
                onValueChange={value => value && setParams({ agent: value }, { state: location.state })}
              >
                <SelectTrigger aria-label={t('Agent')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entries.map(([id, agent]) => (
                    <SelectItem key={id} value={id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          </SettingsContainer>
          {agentId ? (
            <AgentMemorySettings
              key={agentId}
              agentId={agentId}
              requestedThreadId={threadId}
              onThreadChange={id => setParams({ agent: agentId, thread: id }, { state: location.state })}
            />
          ) : (
            <Txt tone="muted">
              {isLoading ? t('Loading...') : isError ? t('Unable to load agents.') : t('No agents available.')}
            </Txt>
          )}
        </section>
      </SettingsLayout>
    </SettingsWorkspace>
  );
}

function AgentMemorySettings({
  agentId,
  requestedThreadId,
  onThreadChange,
}: {
  agentId: string;
  requestedThreadId?: string;
  onThreadChange: (id: string) => void;
}) {
  const [preferences, setPreferences] = useAgentMemoryPreferences(agentId);
  const [requestContext] = useEntityRequestContext('agent', agentId);
  const { data: status, isLoading: statusLoading } = useMemory({ agentId, requestContext });
  const { data: response, isLoading: configLoading } = useMemoryConfig({ agentId, requestContext });
  const config = response?.config;
  const hasMemory = Boolean(status?.result);
  const { data: threads } = useThreads({
    agentId,
    resourceId: agentId,
    isMemoryEnabled: hasMemory,
    requestContext,
    queryOptions: { enabled: hasMemory },
  });
  const threadId = requestedThreadId && requestedThreadId !== 'new' ? requestedThreadId : threads?.[0]?.id;
  const { data: thread } = useThread({
    threadId: threadId ?? '',
    agentId,
    requestContext,
    queryOptions: { enabled: Boolean(threadId) },
  });
  const enabled = preferences.enabled ?? true;
  const disabled = statusLoading || configLoading || !hasMemory;
  const limit =
    preferences.lastMessages ??
    (typeof config?.lastMessages === 'number' && config.lastMessages < Number.MAX_SAFE_INTEGER
      ? config.lastMessages
      : 'auto');

  return (
    <>
      <SettingsGroup>
        <SettingsContainer>
          <SettingsRow
            label={t('Memory')}
            description={t('Remember important information from conversations for future replies.')}
          >
            <Switch
              aria-label={t('Memory')}
              checked={enabled && hasMemory}
              disabled={disabled}
              onCheckedChange={value => setPreferences(previous => ({ ...previous, enabled: value }))}
            />
          </SettingsRow>
          <SettingsRow
            label={t('Working Memory')}
            description={t('Keep lasting notes, preferences, and agreements across conversations.')}
          >
            <Switch
              aria-label={t('Working Memory')}
              checked={preferences.workingMemory ?? Boolean(config?.workingMemory?.enabled)}
              disabled={disabled || !enabled}
              onCheckedChange={value => setPreferences(previous => ({ ...previous, workingMemory: value }))}
            />
          </SettingsRow>
          <SettingsRow
            label={t('Observational Memory')}
            description={
              config?.observationalMemory?.enabled
                ? t('Extract and organize observations from conversation history.')
                : t('Memory not enabled')
            }
          >
            <Switch
              aria-label={t('Observational Memory')}
              checked={Boolean(config?.observationalMemory?.enabled) && (preferences.observationalMemory ?? true)}
              disabled={disabled || !enabled || !config?.observationalMemory?.enabled}
              onCheckedChange={value => setPreferences(previous => ({ ...previous, observationalMemory: value }))}
            />
          </SettingsRow>
          <SettingsRow
            label={t('Recent Messages')}
            description={t(
              'Auto follows the context budget and compression policy. Set a limit to keep fewer recent messages; 0 disables history.',
            )}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                aria-label={t('Recent message limit')}
                min={0}
                max={10000}
                step={1}
                value={limit === 'auto' ? '' : limit}
                placeholder={t('Auto')}
                className="w-24"
                disabled={disabled || !enabled}
                onChange={event => {
                  const count = event.target.value === '' ? 'auto' : Number(event.target.value);
                  if (count === 'auto' || (Number.isInteger(count) && count >= 0 && count <= 10000))
                    setPreferences(previous => ({ ...previous, lastMessages: count }));
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || !enabled}
                aria-pressed={limit === 'auto'}
                onClick={() => setPreferences(previous => ({ ...previous, lastMessages: 'auto' }))}
              >
                {t('Auto')}
              </Button>
            </div>
          </SettingsRow>
        </SettingsContainer>
      </SettingsGroup>
      {hasMemory && (
        <SettingsContainer>
          <SettingsRow label={t('Conversation')} description={t('View and edit the memory used by this conversation.')}>
            {threadId ? (
              <Select value={threadId} onValueChange={value => value && onThreadChange(value)}>
                <SelectTrigger aria-label={t('Conversation')} className="max-w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {threadId && !threads?.some(item => item.id === threadId) && (
                    <SelectItem value={threadId}>{thread?.title ?? threadId}</SelectItem>
                  )}
                  {threads?.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title ?? item.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Txt tone="muted">{t('Memory appears after the first conversation.')}</Txt>
            )}
          </SettingsRow>
          {threadId && (
            <ThreadInputProvider>
              <WorkingMemoryProvider
                key={`${agentId}:${threadId}:${thread?.resourceId ?? agentId}`}
                agentId={agentId}
                threadId={threadId}
                resourceId={thread?.resourceId ?? agentId}
              >
                <ObservationalMemoryProvider>
                  <MemoryTimelineProvider>
                    <MemoryManagement agentId={agentId} threadId={threadId} memoryType={status?.memoryType} />
                  </MemoryTimelineProvider>
                </ObservationalMemoryProvider>
              </WorkingMemoryProvider>
            </ThreadInputProvider>
          )}
        </SettingsContainer>
      )}
      {!statusLoading && !configLoading && !hasMemory && <Txt tone="muted">{t('Memory not enabled')}</Txt>}
    </>
  );
}

export function MemoryManagement({
  agentId,
  threadId,
  memoryType,
}: {
  agentId: string;
  threadId: string;
  memoryType?: 'local' | 'gateway';
}) {
  const { isPanelOpen } = useMemoryTimeline();
  return isPanelOpen ? (
    <div className="h-[36rem]" data-testid="memory-settings-om-detail">
      <MemoryDetailView agentId={agentId} threadId={threadId} />
    </div>
  ) : (
    <AgentMemory agentId={agentId} threadId={threadId} memoryType={memoryType} hideRecentMessages />
  );
}
