import { PageLayout } from '@mastra/playground-ui/components/PageLayout';
import { ThemeToggle } from '@mastra/playground-ui/components/ThemeToggle';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { LanguageSelect } from '@mastra/playground-ui/lib/i18n/language-select';

import {
  SettingsContainer,
  SettingsGroup,
  SettingsLayout,
  SettingsRow,
  SettingsTitle,
} from '@mastra/playground-ui/new/settings';
import { useAccount } from '@/domains/account/account-context';
import { StudioConnectionSettings } from '@/domains/configuration/components/studio-connection-settings';

export const StudioSettingsPage = () => {
  useLocale();
  const account = useAccount();
  return (
    <PageLayout>
      <SettingsLayout title={studioT('Settings')}>
        <SettingsGroup>
          <SettingsTitle info={studioT('Stored in this browser.')}>{studioT('General')}</SettingsTitle>
          <SettingsContainer>
            <SettingsRow label={studioT('Language')} description={studioT('Choose the language used in Studio.')}>
              <LanguageSelect />
            </SettingsRow>
            <SettingsRow label={studioT('Theme')} description={studioT('Color scheme for the interface.')}>
              <ThemeToggle />
            </SettingsRow>
          </SettingsContainer>
        </SettingsGroup>

        {!account && <StudioConnectionSettings />}
      </SettingsLayout>
    </PageLayout>
  );
};
