import { Button } from '@mastra/playground-ui/components/Button';
import { useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { Skeleton } from '@mastra/playground-ui/components/Skeleton';
import { ThreadListEmpty, ThreadListItems } from '@mastra/playground-ui/components/ThreadList';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useAgents } from '@mastra/react/hooks/agents';
import { useState } from 'react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { useConversationProjects } from '../use-conversation-projects';
import type { ConversationProject } from '../use-conversation-projects';
import { useConversationScope } from '../use-conversation-scope';
import { useSidebarThreads } from '../use-sidebar-threads';
import { isThreadArchived } from '../use-thread-archive';
import { ConversationSection } from './conversation-section';
import { ProjectNameDialog } from './project-name-dialog';
import { SidebarConversationRow } from './sidebar-conversation-row';
import { SidebarProjectRow } from './sidebar-project-row';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

export function SidebarConversations() {
  const scope = useConversationScope();
  const { hasPermission, isLoading } = usePermissions();
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const { data: agents } = useAgents({ queryOptions: { enabled: !isLoading && hasPermission('agents:read') } });
  const activeAgentId = (matchPath('/chat/:agentId/*', pathname) ?? matchPath('/agents/:agentId/*', pathname))?.params
    .agentId;
  const newAgentId = activeAgentId ?? Object.keys(agents ?? {})[0];
  if (state !== 'default' || isLoading || !hasPermission('agents:read')) return null;
  return (
    <>
      {newAgentId && <SidebarNewConversation agentId={newAgentId} />}
      {hasPermission('memory:read') && <SidebarConversationsBody key={scope} scope={scope} agentId={newAgentId} />}
    </>
  );
}

function SidebarNewConversation({ agentId }: { agentId: string }) {
  useLocale();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <div className="mt-3.5">
      <Button
        variant="ghost"
        render={
          <Link
            to={`/chat/${encodeURIComponent(agentId)}/threads/new`}
            onClick={() => isMobile && setOpenMobile(false)}
          />
        }
      >
        <IconPlusMedium />
        {t('New Thread')}
      </Button>
    </div>
  );
}

function SidebarConversationsBody({ scope, agentId }: { scope: string; agentId?: string }) {
  const navigate = useNavigate();
  useLocale();
  const { isMobile, setOpenMobile } = useSidebar();
  const organization = useConversationProjects(scope);
  const { threads: allThreads, isLoading, error, retry } = useSidebarThreads(scope);
  const threads = allThreads.filter(thread => !isThreadArchived(thread));
  const [editProject, setEditProject] = useState<ConversationProject | 'new'>();
  const groupedIds = new Set(organization.projects.flatMap(project => project.threads));
  const sorted = [...threads].sort(
    (a, b) => Number(organization.pinned.includes(b.id)) - Number(organization.pinned.includes(a.id)),
  );
  const onNavigate = () => {
    if (isMobile) setOpenMobile(false);
  };
  const rows = (ids?: string[]) => (
    <ThreadListItems>
      {sorted
        .filter(thread => (ids ? ids.includes(thread.id) : !groupedIds.has(thread.id)))
        .map(thread => (
          <SidebarConversationRow key={thread.id} thread={thread} organization={organization} onNavigate={onNavigate} />
        ))}
    </ThreadListItems>
  );
  return (
    <>
      <ConversationSection
        label={t('Projects')}
        collapsed={organization.collapsed.includes('projects')}
        onToggle={() => void organization.toggle('projects').catch(() => {})}
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!agentId || organization.isLoading || Boolean(organization.error)}
            aria-label={t('New project')}
            onClick={() => setEditProject('new')}
          >
            <IconPlusMedium />
          </Button>
        }
      >
        {organization.error && (
          <div role="alert">
            <ThreadListEmpty>{t('Failed to load projects')}</ThreadListEmpty>
            <Button size="sm" onClick={organization.retry}>
              {t('Retry')}
            </Button>
          </div>
        )}
        {organization.isLoading && <Skeleton className="h-5 w-full" />}
        {!organization.isLoading && !organization.error && organization.projects.length === 0 && (
          <ThreadListEmpty>{t('No projects')}</ThreadListEmpty>
        )}
        {[...organization.projects]
          .sort(
            (a, b) => Number(organization.projectPins.includes(b.id)) - Number(organization.projectPins.includes(a.id)),
          )
          .map(project => (
            <SidebarProjectRow
              key={project.id}
              project={project}
              agentId={project.agentId ?? agentId ?? ''}
              organization={organization}
              onNavigate={onNavigate}
            >
              {rows(project.threads)}
              {!threads.some(thread => project.threads.includes(thread.id)) && (
                <ThreadListEmpty>{t('No chats yet')}</ThreadListEmpty>
              )}
            </SidebarProjectRow>
          ))}
      </ConversationSection>
      <ConversationSection
        label={t('Recent')}
        collapsed={organization.collapsed.includes('recent')}
        onToggle={() => void organization.toggle('recent').catch(() => {})}
      >
        {isLoading && (
          <div className="space-y-2 px-3 py-2" aria-label={t('Loading conversations')}>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        )}
        {rows()}
        {error && (
          <div className="px-3 py-2">
            <ThreadListEmpty>{t('Failed to load conversations')}</ThreadListEmpty>
            <Button size="sm" onClick={retry}>
              {t('Retry')}
            </Button>
          </div>
        )}
        {!isLoading && !error && !sorted.some(thread => !groupedIds.has(thread.id)) && (
          <ThreadListEmpty>{t('No recent conversations')}</ThreadListEmpty>
        )}
      </ConversationSection>
      {editProject && (
        <ProjectNameDialog
          initialName={editProject === 'new' ? undefined : editProject.name}
          onClose={() => setEditProject(undefined)}
          onSave={async name => {
            if (editProject === 'new') {
              const project = await organization.create(name, agentId);
              if (agentId) {
                void navigate(`/chat/${encodeURIComponent(agentId)}/projects/${project.id}`);
                onNavigate();
              }
            } else await organization.rename(editProject.id, name);
          }}
        />
      )}
    </>
  );
}
