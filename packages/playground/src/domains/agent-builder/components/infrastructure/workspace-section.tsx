import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { InfrastructureStatusResponse } from '@mastra/client-js';
import {
  SettingsContainer,
  SettingsEmptyRow,
  SettingsGroup,
  SettingsItem,
  SettingsTitle,
} from '@mastra/playground-ui/new/settings';
import { titleCaseOrNotSet } from './format-infrastructure-value';
import { InfrastructureConfigRows } from './infrastructure-config-rows';
import { InfrastructureDetailRow } from './infrastructure-detail-row';
import { InfrastructureStatusBadge } from './infrastructure-status-badge';

type Workspace = InfrastructureStatusResponse['workspace'];

const workspaceTitle = (workspace: Workspace) => {
  if (workspace.workspaceId) return workspace.workspaceId;
  if (workspace.name) return workspace.name;
  return studioT('Inline workspace');
};

const WorkspaceRows = ({ workspace }: { workspace: Workspace }) => {
  useLocale();
  return (
    <>
      <SettingsItem title={workspaceTitle(workspace)}>
        <InfrastructureStatusBadge ok={workspace.hasFilesystem} label={studioT('Filesystem')} />
        <InfrastructureStatusBadge ok={workspace.hasSandbox} label={studioT('Sandbox')} />
      </SettingsItem>
      <InfrastructureDetailRow
        label={studioT('Config type')}
        value={workspace.type === 'id' ? studioT('Registered workspace') : studioT('Inline config')}
      />
      {workspace.workspaceId ? (
        <InfrastructureDetailRow label={studioT('Workspace ID')} value={workspace.workspaceId} />
      ) : null}
      <InfrastructureDetailRow label={studioT('Name')} value={workspace.name ?? studioT('Not set')} />
      <InfrastructureDetailRow
        label={studioT('Filesystem provider')}
        value={titleCaseOrNotSet(workspace.filesystemProvider)}
      />
      <InfrastructureDetailRow
        label={studioT('Sandbox provider')}
        value={titleCaseOrNotSet(workspace.sandboxProvider)}
      />
      <InfrastructureConfigRows entries={workspace.config} />
    </>
  );
};

export const WorkspaceSection = ({ workspace }: { workspace: Workspace }) => {
  useLocale();
  return (
    <SettingsGroup>
      <SettingsTitle
        info={studioT(
          'Workspace config used for generated files and sandbox execution. This reports the builder workspace only, not agent-specific runtime workspaces.',
        )}
      >
        {studioT('Workspace')}
      </SettingsTitle>
      <SettingsContainer>
        {workspace.type ? (
          <WorkspaceRows workspace={workspace} />
        ) : (
          <SettingsEmptyRow>{studioT('No workspace configured.')}</SettingsEmptyRow>
        )}
      </SettingsContainer>
    </SettingsGroup>
  );
};
