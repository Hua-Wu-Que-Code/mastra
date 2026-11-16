import { Button } from '@mastra/playground-ui/components/Button';
import { IconGlobe } from '@mastra/playground-ui/icons/central/IconGlobe';
import { IconLock } from '@mastra/playground-ui/icons/central/IconLock';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import { useVisibilityChange } from '../../hooks/use-visibility-change-agent';
import type { AgentBuilderEditFormValues } from '../../schemas';

export type Visibility = 'private' | 'public';

export interface VisibilitySelectProps {
  agentId: string;
}

export function VisibilitySelect({ agentId }: VisibilitySelectProps) {
  useLocale();
  const formMethods = useFormContext<AgentBuilderEditFormValues>();
  const watchValue = useWatch({ control: formMethods.control, name: 'visibility' });
  const { requestChange, dialog } = useVisibilityChange(agentId);

  const value = watchValue ?? 'private';

  return (
    <>
      {value === 'private' ? (
        <Button
          size="sm"
          variant="default"
          onClick={() => requestChange('public')}
          data-testid="agent-builder-visibility-add"
          icon={<IconGlobe />}
        >
          {studioT('Add to library')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => requestChange('private')}
          data-testid="agent-builder-visibility-remove"
          icon={<IconLock />}
        >
          {studioT('Remove from library')}
        </Button>
      )}
      {dialog}
    </>
  );
}
