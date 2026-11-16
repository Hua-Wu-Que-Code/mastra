import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { Link } from 'react-router';

export function AgentUnavailable() {
  useLocale();
  return (
    <EmptyState
      tone="error"
      titleSlot={studioT('Agent not found')}
      descriptionSlot={studioT(
        'This agent may have been renamed or removed. Reload to check again, or choose another agent.',
      )}
      actionSlot={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>{studioT('Reload')}</Button>
          <Button render={<Link to="/agents" />}>{studioT('Choose agent')}</Button>
        </div>
      }
    />
  );
}
