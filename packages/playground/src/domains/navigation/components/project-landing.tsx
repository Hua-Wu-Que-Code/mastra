import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { Tabs, Tab, TabList, TabContent } from '@mastra/playground-ui/components/Tabs';
import { ThreadListItems } from '@mastra/playground-ui/components/ThreadList';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconFolder1 } from '@mastra/playground-ui/icons/central/IconFolder1';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { ConversationProject } from '../use-conversation-projects';
import { useConversationProjects } from '../use-conversation-projects';
import { useConversationScope } from '../use-conversation-scope';
import { useSidebarThreads } from '../use-sidebar-threads';
import { isThreadArchived } from '../use-thread-archive';
import { ProjectActions } from './project-actions';
import { ProjectSources } from './project-sources';
import { SidebarConversationRow } from './sidebar-conversation-row';

export function ProjectLandingHeader({ project, agentId }: { project: ConversationProject; agentId: string }) {
  useLocale();
  return (
    <header className="flex min-w-0 items-center gap-3">
      <IconFolder1 className="size-icon-lg shrink-0" />
      <Txt as="h1" variant="heading" className="min-w-0 flex-1 truncate" title={project.name}>
        {project.name}
      </Txt>
      <ProjectActions project={project} agentId={agentId} />
    </header>
  );
}

export function ProjectLandingContent({ project }: { project: ConversationProject }) {
  useLocale();
  const scope = useConversationScope();
  const organization = useConversationProjects(scope);
  const history = useSidebarThreads(scope);
  const threads = history.threads.filter(thread => project.threads.includes(thread.id) && !isThreadArchived(thread));
  return (
    <Tabs defaultTab="chats" className="min-h-0">
      <TabList variant="pill">
        <Tab value="chats">{t('Chats')}</Tab>
        <Tab value="sources">{t('Sources')}</Tab>
      </TabList>
      <TabContent value="chats">
        {history.isLoading ? (
          <Txt tone="muted" className="py-8">
            {t('Loading conversations')}
          </Txt>
        ) : history.error ? (
          <div className="space-y-3 py-8">
            <Txt role="alert">{t('Failed to load conversations')}</Txt>
            <Button size="sm" onClick={history.retry}>
              {t('Retry')}
            </Button>
          </div>
        ) : threads.length ? (
          <div className="py-4">
            <ThreadListItems>
              {threads.map(thread => (
                <SidebarConversationRow
                  key={thread.id}
                  thread={thread}
                  organization={organization}
                  onNavigate={() => {}}
                />
              ))}
            </ThreadListItems>
          </div>
        ) : (
          <EmptyState
            iconSlot={null}
            className="py-16"
            titleSlot={t('No chats yet')}
            descriptionSlot={t('Chats in {name} will appear here.', { name: project.name })}
          />
        )}
      </TabContent>
      <TabContent value="sources">
        <ProjectSources key={project.id} project={project} />
      </TabContent>
    </Tabs>
  );
}
