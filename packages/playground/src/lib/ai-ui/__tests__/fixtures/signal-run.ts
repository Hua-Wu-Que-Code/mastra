import type { RouteResponse } from '@mastra/client-js';
import { ChunkFrom } from '@mastra/core/stream';
import type { ChunkType } from '@mastra/core/stream';

const RUN_ID = 'run-1';

export const signalRunStart: ChunkType = { type: 'start', runId: RUN_ID, from: ChunkFrom.AGENT, payload: {} };

export const acceptedSignalMessage: RouteResponse<'POST /agents/:agentId/send-message'> = {
  accepted: true,
  runId: RUN_ID,
};

export const abortedSignalRun: RouteResponse<'POST /agents/:agentId/threads/abort'> = { aborted: true };

export const queuedUserMessage = (
  id: string,
  contents: string,
  position: number,
  clientMessageId?: string,
): ChunkType => ({
  type: 'data-user-message-pending',
  runId: RUN_ID,
  from: ChunkFrom.AGENT,
  transient: true,
  data: {
    type: 'user',
    id,
    contents,
    createdAt: new Date(0).toISOString(),
    metadata: { status: 'queued', queuePosition: position, ...(clientMessageId ? { clientMessageId } : {}) },
  },
});

export const cancelledUserMessage = (id: string): ChunkType => ({
  type: 'data-user-message-cancelled',
  runId: RUN_ID,
  from: ChunkFrom.AGENT,
  transient: true,
  data: { id },
});

export const steeringUserMessage = (id: string, contents: string): ChunkType => ({
  type: 'data-user-message-pending',
  runId: RUN_ID,
  from: ChunkFrom.AGENT,
  transient: true,
  data: { type: 'user', id, contents, createdAt: new Date(0).toISOString(), metadata: { status: 'pending' } },
});
