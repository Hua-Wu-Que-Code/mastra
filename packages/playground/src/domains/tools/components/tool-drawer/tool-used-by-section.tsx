import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { SettingsGroup, SettingsTitle } from '@mastra/playground-ui/new/settings';
import { ToolSectionHeader } from '../tool-section-header';
import { ToolUsedByRows } from './tool-used-by-rows';

export interface ToolUsedBySectionProps {
  toolId: string;
  currentAgentId?: string;
}

export function ToolUsedBySection(props: ToolUsedBySectionProps) {
  useLocale();
  return (
    <SettingsGroup>
      <ToolSectionHeader>
        <SettingsTitle>{studioT('Used by')}</SettingsTitle>
      </ToolSectionHeader>
      <ToolUsedByRows {...props} />
    </SettingsGroup>
  );
}
