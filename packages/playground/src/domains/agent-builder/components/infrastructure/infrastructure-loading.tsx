import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { SettingsContainer, SettingsGroup, SettingsSkeleton, SettingsTitle } from '@mastra/playground-ui/new/settings';

export const InfrastructureLoading = () => {
  useLocale();
  return (
    <SettingsGroup>
      <SettingsTitle>{studioT('Agent Builder')}</SettingsTitle>
      <SettingsContainer>
        <SettingsSkeleton label={studioT('Loading infrastructure configuration')} variant="item" rows={3} />
      </SettingsContainer>
    </SettingsGroup>
  );
};
