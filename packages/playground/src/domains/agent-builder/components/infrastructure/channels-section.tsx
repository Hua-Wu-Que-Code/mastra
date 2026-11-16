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
import { InfrastructureStatusBadge } from './infrastructure-status-badge';

export interface ChannelsSectionProps {
  providers: InfrastructureStatusResponse['channels']['providers'];
}

export const ChannelsSection = ({ providers }: ChannelsSectionProps) => {
  useLocale();
  return (
    <SettingsGroup>
      <SettingsTitle
        info={studioT(
          'Configured channel providers available to Agent Builder publish/share flows. Unconfigured providers are omitted until their required environment/config is present.',
        )}
      >
        {studioT('Channels')}
      </SettingsTitle>
      <SettingsContainer>
        {providers.length === 0 ? (
          <SettingsEmptyRow>{studioT('No configured channel providers for Agent Builder.')}</SettingsEmptyRow>
        ) : (
          providers.map(provider => (
            <SettingsItem
              key={provider.id}
              title={titleCase(provider.name)}
              description={studioT('Provider ID: {value0}, {value1} provider routes', {
                value0: provider.id,
                value1: provider.routeCount,
              })}
            >
              <InfrastructureStatusBadge
                ok={provider.isConfigured}
                label={provider.isConfigured ? studioT('Configured') : studioT('Not configured')}
              />
            </SettingsItem>
          ))
        )}
      </SettingsContainer>
    </SettingsGroup>
  );
};
