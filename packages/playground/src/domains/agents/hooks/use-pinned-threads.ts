import { useConversationProjects } from '@/domains/navigation/use-conversation-projects';
import { useConversationScope } from '@/domains/navigation/use-conversation-scope';

export const usePinnedThreads = (_resourceType: 'agent' | 'network', _resourceId: string) => {
  const organization = useConversationProjects(useConversationScope());
  const pin = (id: string) => {
    void organization.setPinned(id, true).catch(() => {});
  };
  const unpin = (id: string) => {
    void organization.setPinned(id, false).catch(() => {});
  };
  return { pinnedIds: organization.pinned, pin, unpin };
};
