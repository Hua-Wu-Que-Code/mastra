import { Button } from '@mastra/playground-ui/components/Button';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { Skeleton } from '@mastra/playground-ui/components/Skeleton';
import { ThreadListEmpty, ThreadListItems } from '@mastra/playground-ui/components/ThreadList';
import { IconDotGrid1x3Vertical } from '@mastra/playground-ui/icons/central/IconDotGrid1x3Vertical';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMastraClient } from '@mastra/react';
import { isAuthenticated, useAuthCapabilities } from '@mastra/react/hooks/auth';
import { useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router';
import { useConversationProjects } from '../use-conversation-projects';
import type { ConversationProject } from '../use-conversation-projects';
import { useSidebarThreads } from '../use-sidebar-threads';
import { ConversationSection } from './conversation-section';
import { ProjectNameDialog } from './project-name-dialog';
import { SidebarConversationRow } from './sidebar-conversation-row';
import { useAccount } from '@/domains/account/account-context';
import { AgentCapabilitiesFooter } from '@/domains/agents/components/memory-sidebar/agent-capabilities-footer';
import { usePermissions } from '@/domains/auth/hooks/use-permissions';

export function SidebarConversations() {
  const account = useAccount();
  const { data: auth } = useAuthCapabilities();
  const { hasPermission, isLoading } = usePermissions();
  const client = useMastraClient();
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const activeAgentId = matchPath('/agents/:agentId/*', pathname)?.params.agentId;
  const userId = account?.user.id ?? (auth && isAuthenticated(auth) ? auth.user.id : 'local');
  if (state !== 'default' || isLoading || !hasPermission('agents:read')) return null;
  const scope = JSON.stringify([client.options.baseUrl, client.options.apiPrefix, userId]);
  return (
    <>
      {activeAgentId && <SidebarNewConversation agentId={activeAgentId} />}
      {hasPermission('memory:read') && <SidebarConversationsBody key={scope} scope={scope} />}
      {activeAgentId && <AgentCapabilitiesFooter agentId={activeAgentId} />}
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
            to={`/agents/${encodeURIComponent(agentId)}/threads/new`}
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

function SidebarConversationsBody({ scope }: { scope: string }) {
  useLocale();
  const { isMobile, setOpenMobile } = useSidebar();
  const organization = useConversationProjects(scope);
  const { threads, isLoading, error, retry } = useSidebarThreads(scope);
  const { pathname } = useLocation();
  const activeAgentId = matchPath('/agents/:agentId/*', pathname)?.params.agentId;
  const newAgentId = activeAgentId ? undefined : threads[0]?.agentId;
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
      {newAgentId && <SidebarNewConversation agentId={newAgentId} />}
      <ConversationSection
        label={t('Projects')}
        collapsed={organization.collapsed.includes('projects')}
        onToggle={() => organization.toggle('projects')}
        actions={
          <Button variant="ghost" size="icon-sm" aria-label={t('New project')} onClick={() => setEditProject('new')}>
            <IconPlusMedium />
          </Button>
        }
      >
        {organization.projects.length === 0 && <ThreadListEmpty>{t('No projects')}</ThreadListEmpty>}
        {organization.projects.map(project => (
          <ConversationSection
            key={project.id}
            label={project.name}
            collapsed={organization.collapsed.includes(project.id)}
            onToggle={() => organization.toggle(project.id)}
            actions={
              <DropdownMenu>
                <DropdownMenu.Trigger variant="ghost" size="icon-sm" aria-label={t('Project actions')}>
                  <IconDotGrid1x3Vertical />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onClick={() => setEditProject(project)}>{t('Rename project')}</DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => organization.remove(project.id)}>
                    {t('Ungroup project')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            }
          >
            {rows(project.threads)}
            {!threads.some(thread => project.threads.includes(thread.id)) && (
              <ThreadListEmpty>{t('Move conversations here from their actions menu.')}</ThreadListEmpty>
            )}
          </ConversationSection>
        ))}
      </ConversationSection>
      <ConversationSection
        label={t('Recent')}
        collapsed={organization.collapsed.includes('recent')}
        onToggle={() => organization.toggle('recent')}
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
          onSave={name => {
            if (editProject === 'new') organization.create(name);
            else organization.rename(editProject.id, name);
          }}
        />
      )}
    </>
  );
}
