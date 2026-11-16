import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { InfrastructureStatusResponse } from '@mastra/client-js';
import { SettingsContainer, SettingsGroup, SettingsItem, SettingsTitle } from '@mastra/playground-ui/new/settings';
import { InfrastructureStatusBadge } from './infrastructure-status-badge';

export interface RegistriesSectionProps {
  registries: InfrastructureStatusResponse['registries'];
}

export const RegistriesSection = ({ registries }: RegistriesSectionProps) => {
  useLocale();
  const skillsShEnabled = registries?.skillsSh?.enabled ?? false;

  return (
    <SettingsGroup>
      <SettingsTitle info={studioT('External skill registries available to import skills into the workspace.')}>
        {studioT('Registries')}
      </SettingsTitle>
      <SettingsContainer>
        <SettingsItem title={studioT('skills.sh')} description={studioT('GitHub-backed public skills registry.')}>
          <InfrastructureStatusBadge
            ok={skillsShEnabled}
            label={skillsShEnabled ? studioT('Enabled') : studioT('Disabled')}
          />
        </SettingsItem>
      </SettingsContainer>
    </SettingsGroup>
  );
};
