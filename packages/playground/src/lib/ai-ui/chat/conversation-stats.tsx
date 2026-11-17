import { ChatSessionStats } from '@mastra/playground-ui/domains/chat';
import { cleanProviderId } from '@mastra/playground-ui/domains/llm';
import { useLLMProviders } from '@mastra/react/hooks/llm';
import { useAgentSettings } from '@/domains/agents/context/agent-context';
import { usePlaygroundModelOptional } from '@/domains/agents/context/playground-model-context';

export function ConversationStats() {
  const selection = usePlaygroundModelOptional();
  const { settings } = useAgentSettings();
  const { data } = useLLMProviders();
  const provider = data?.providers.find(
    provider => cleanProviderId(provider.id) === cleanProviderId(selection?.provider ?? ''),
  );
  const model = selection?.model;
  const reasoning = model ? provider?.modelReasoning?.[model] : undefined;
  const storedLevel = provider
    ? settings?.modelSettings.providerOptions?.[cleanProviderId(provider.id)]?.reasoningLevel
    : undefined;
  const level =
    typeof storedLevel === 'string' && reasoning?.levels.includes(storedLevel) ? storedLevel : reasoning?.defaultLevel;
  // Once route-specific capacities are published, a missing level is unknown, not the default route's limit.
  const capacity =
    reasoning?.contextWindows !== undefined
      ? level
        ? reasoning.contextWindows[level]
        : undefined
      : model
        ? provider?.modelContextWindows?.[model]
        : undefined;
  return (
    <ChatSessionStats
      contextWindow={capacity}
      route={provider && model ? `${cleanProviderId(provider.id)}/${model}` : undefined}
    />
  );
}
