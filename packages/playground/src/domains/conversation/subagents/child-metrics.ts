import { t } from '@mastra/playground-ui/lib/i18n';
import type { ChildAgent } from './subagent-api';

export function childUsage(child: ChildAgent) {
  return child.totalTokens === undefined
    ? t('Not provided')
    : `${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(child.totalTokens)} tok`;
}
export function childDuration(child: ChildAgent) {
  const seconds = Math.floor(child.elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
