import { Button } from '@mastra/playground-ui/components/Button';
import { Collapsible, CollapsibleContent } from '@mastra/playground-ui/components/Collapsible';
import { ThreadListItem } from '@mastra/playground-ui/components/ThreadList';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconChevronDownMedium } from '@mastra/playground-ui/icons/central/IconChevronDownMedium';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { IconPencil } from '@mastra/playground-ui/icons/central/IconPencil';
import { IconPin } from '@mastra/playground-ui/icons/central/IconPin';
import { t } from '@mastra/playground-ui/lib/i18n';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ConversationOrganization, ConversationProject } from '../use-conversation-projects';
import { ProjectActions } from './project-actions';

export function SidebarProjectRow({
  project,
  agentId,
  organization,
  onNavigate,
  children,
}: {
  project: ConversationProject;
  agentId: string;
  organization: ConversationOrganization;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const open = !organization.collapsed.includes(project.id);
  return (
    <Collapsible open={open}>
      <ol className="min-w-0">
        <ThreadListItem
          aria-expanded={open}
          onClick={() => void organization.toggle(project.id).catch(() => {})}
          className="pr-16"
          actions={
            <>
              <ProjectActions project={project} agentId={agentId} />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('New chat in {name}', { name: project.name })}
                render={
                  <Link
                    to={`/chat/${encodeURIComponent(agentId)}/threads/new?project=${encodeURIComponent(project.id)}`}
                    onClick={onNavigate}
                  />
                }
              >
                <IconPencil />
              </Button>
            </>
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative size-4 shrink-0" aria-hidden="true">
              <IconFolder1 className="absolute inset-0 size-icon-sm group-focus-within:opacity-0 group-hover:opacity-0" />
              <IconChevronDownMedium
                className={`absolute inset-0 size-icon-sm opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 ${open ? '' : '-rotate-90'}`}
              />
            </span>
            {organization.projectPins.includes(project.id) && <IconPin className="size-icon-xs shrink-0" />}
            <Txt as="span" variant="body-sm" className="truncate" title={project.name}>
              {project.name}
            </Txt>
          </span>
        </ThreadListItem>
      </ol>
      <CollapsibleContent>
        <div className="pl-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
