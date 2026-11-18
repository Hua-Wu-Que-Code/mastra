import { useLocation, Navigate } from 'react-router';
import { AgentMemory } from '@/domains/agents/components/memory-sidebar/agent-memory';
import { MemoryDetailView } from '@/domains/agents/components/memory-sidebar/memory-detail-view';
import { useMemoryTimeline } from '@/domains/agents/context';

/** Keep bookmarked memory settings URLs working after consolidation into General. */
export function MemorySettingsPage() {
  const location = useLocation();
  return <Navigate to="/settings" replace state={location.state} />;
}

export function MemoryManagement({
  agentId,
  threadId,
  memoryType,
}: {
  agentId: string;
  threadId: string;
  memoryType?: 'local' | 'gateway';
}) {
  const { isPanelOpen } = useMemoryTimeline();
  return isPanelOpen ? (
    <div className="h-[36rem]" data-testid="memory-settings-om-detail">
      <MemoryDetailView agentId={agentId} threadId={threadId} />
    </div>
  ) : (
    <AgentMemory agentId={agentId} threadId={threadId} memoryType={memoryType} hideRecentMessages />
  );
}
