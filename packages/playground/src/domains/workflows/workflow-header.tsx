import { Button } from '@mastra/playground-ui/components/Button';
import { ApiIcon } from '@mastra/playground-ui/icons/ApiIcon';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export function WorkflowHeader() {
  useLocale();
  return (
    <Button
      render={<a target="_blank" rel="noopener noreferrer" href="/swagger-ui" />}
      variant="ghost"
      size="sm"
      icon={<ApiIcon />}
    >
      {studioT('API endpoints')}
    </Button>
  );
}
