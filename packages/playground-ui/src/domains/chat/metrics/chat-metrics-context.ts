import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { createContext, useContext } from 'react';
import type { RunMetrics } from './chat-metrics';

export const ChatMetricsContext = createContext<{
  metrics: RunMetrics[];
  owners: Map<string, string>;
  incomplete: boolean;
}>({
  metrics: [],
  owners: new Map(),
  incomplete: false,
});
export const usePartialMetrics = () => useContext(ChatMetricsContext).incomplete;
export const useChatMetrics = () => useContext(ChatMetricsContext).metrics;

export function useTurnMetrics(messages: MastraDBMessage[]): RunMetrics[] {
  const { metrics, owners } = useContext(ChatMetricsContext);
  const ids = new Set(messages.map(message => message.id));
  // A steer can place two user turns inside one run. Its usage belongs to the final tail exactly once.
  return metrics.filter(metric => {
    const owner = owners.get(metric.traceId);
    return owner !== undefined && ids.has(owner);
  });
}
