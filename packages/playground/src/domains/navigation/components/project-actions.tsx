import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { IconDotGrid1x3Horizontal } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Horizontal';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { IconPin } from '@mastra/playground-ui/icons/central/IconPin';
import { IconUnpin } from '@mastra/playground-ui/icons/central/IconUnpin';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t } from '@mastra/playground-ui/lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router';
import type { ConversationProject } from '../use-conversation-projects';
import { useConversationProjects } from '../use-conversation-projects';
import { useConversationScope } from '../use-conversation-scope';
import { ProjectDeleteDialog } from './project-delete-dialog';
import { ProjectNameDialog } from './project-name-dialog';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

export function ProjectActions({ project, agentId }: { project: ConversationProject; agentId: string }) {
  const organization = useConversationProjects(useConversationScope());
  const { canDelete } = usePermissions();
  const [dialog, setDialog] = useState<'rename' | 'delete'>();
  const pinned = organization.projectPins.includes(project.id);
  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger variant="ghost" size="icon-sm" aria-label={t('Project actions')}>
          <IconDotGrid1x3Horizontal />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" finalFocus={false}>
          <DropdownMenu.Item onClick={() => setDialog('rename')}>
            <IconPencil />
            {t('Rename project')}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            render={<Link to={`/chat/${encodeURIComponent(agentId)}/projects/${encodeURIComponent(project.id)}`} />}
          >
            <IconFolder1 />
            {t('Project home')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => void organization.pinProject(project.id).catch(() => {})}>
            {pinned ? <IconUnpin /> : <IconPin />}
            {pinned ? t('Unpin project') : t('Pin project')}
          </DropdownMenu.Item>
          {canDelete('memory') && (
            <DropdownMenu.Item variant="destructive" onClick={() => setDialog('delete')}>
              <TrashIcon />
              {t('Delete project')}
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>
      {dialog === 'rename' && (
        <ProjectNameDialog
          initialName={project.name}
          onClose={() => setDialog(undefined)}
          onSave={name => organization.rename(project.id, name)}
        />
      )}
      {dialog === 'delete' && (
        <ProjectDeleteDialog project={project} agentId={agentId} onClose={() => setDialog(undefined)} />
      )}
    </>
  );
}
