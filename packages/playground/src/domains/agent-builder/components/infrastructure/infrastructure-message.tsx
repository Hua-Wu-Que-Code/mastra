import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { SettingsContainer, SettingsEmptyRow, SettingsGroup, SettingsTitle } from '@mastra/playground-ui/new/settings';

export const InfrastructureMessage = ({ message }: { message: string }) => {
  useLocale();
  return (
    <SettingsGroup>
      <SettingsTitle>{studioT('Agent Builder')}</SettingsTitle>
      <SettingsContainer>
        <SettingsEmptyRow>{message}</SettingsEmptyRow>
      </SettingsContainer>
    </SettingsGroup>
  );
};
