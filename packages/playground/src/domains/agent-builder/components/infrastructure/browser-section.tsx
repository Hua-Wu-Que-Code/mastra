import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { InfrastructureStatusResponse } from '@mastra/client-js';
import {
  SettingsContainer,
  SettingsEmptyRow,
  SettingsGroup,
  SettingsItem,
  SettingsTitle,
} from '@mastra/playground-ui/new/settings';
import { titleCase } from './format-infrastructure-value';
import { InfrastructureConfigRows } from './infrastructure-config-rows';
import { InfrastructureDetailRow } from './infrastructure-detail-row';
import { InfrastructureStatusBadge } from './infrastructure-status-badge';

type Browser = InfrastructureStatusResponse['browser'];

const BrowserRows = ({ browser, provider }: { browser: Browser; provider: string }) => {
  useLocale();
  return (
    <>
      <SettingsItem title={titleCase(provider)}>
        <InfrastructureStatusBadge
          ok={browser.registered}
          label={browser.registered ? studioT('Provider available') : studioT('Provider missing')}
        />
      </SettingsItem>
      {browser.env ? <InfrastructureDetailRow label={studioT('Environment')} value={titleCase(browser.env)} /> : null}
      <InfrastructureConfigRows entries={browser.config} />
    </>
  );
};

export const BrowserSection = ({ browser }: { browser: Browser }) => {
  useLocale();
  return (
    <SettingsGroup>
      <SettingsTitle
        info={studioT(
          'Browser automation provider configured for builder agents, with only the non-default options passed in configuration.',
        )}
      >
        {studioT('Browser')}
      </SettingsTitle>
      <SettingsContainer>
        {browser.provider ? (
          <BrowserRows browser={browser} provider={browser.provider} />
        ) : (
          <SettingsEmptyRow>{studioT('No browser configured.')}</SettingsEmptyRow>
        )}
      </SettingsContainer>
    </SettingsGroup>
  );
};
