import { ChatPreferencesSettings } from '@mastra/playground-ui/domains/chat';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { LanguageSelect } from '@mastra/playground-ui/lib/i18n/language-select';

import {
  SettingsContainer,
  SettingsGroup,
  SettingsLayout,
  SettingsRow,
  SettingsTitle,
} from '@mastra/playground-ui/new/settings';
import { AppearanceSettings } from './appearance-settings';
import { SettingsWorkspace } from './settings-workspace';
import { useAccount } from '@/domains/account/account-context';
import { StudioConnectionSettings } from '@/domains/configuration/components/studio-connection-settings';

export const StudioSettingsPage = () => {
  useLocale();
  const account = useAccount();
  return (
    <SettingsWorkspace>
      <SettingsLayout title={studioT('General')}>
        <section className="space-y-7">
          <SettingsGroup>
            <SettingsTitle info={studioT('Stored in this browser.')}>{studioT('General')}</SettingsTitle>
            <SettingsContainer className="rounded-none border-y border-border bg-transparent px-0">
              <SettingsRow label={studioT('Language')} description={studioT('Choose the language used in Studio.')}>
                <LanguageSelect />
              </SettingsRow>
              <AppearanceSettings />
              <ChatPreferencesSettings />
            </SettingsContainer>
          </SettingsGroup>

          {!account && <StudioConnectionSettings />}
        </section>
      </SettingsLayout>
    </SettingsWorkspace>
  );
};
