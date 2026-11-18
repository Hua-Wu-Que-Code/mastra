import { MASTRA_RESOURCE_ID_KEY, MASTRA_NORMALIZED_USER_KEY } from '@mastra/core/request-context';
import type { ToolExecutionContext } from '@mastra/core/tools';

export class AltflowToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AltflowToolError';
  }
}

export interface ToolIdentity {
  userId: string;
  resourceId: string;
  agentId: string;
  threadId?: string;
  toolCallId?: string;
}

// Host authentication must overwrite this reserved key. Child runs retain the
// account scope while Mastra assigns them their own memory resource identities.
export const ALTFLOW_ACCOUNT_RESOURCE_KEY = 'mastra__altflowAccountResourceId';

/** Identity comes exclusively from server-authenticated execution context. */
export function toolIdentity(context: ToolExecutionContext | undefined): ToolIdentity {
  const resourceId =
    context?.requestContext?.getRaw(ALTFLOW_ACCOUNT_RESOURCE_KEY) ??
    context?.requestContext?.get(MASTRA_RESOURCE_ID_KEY);
  const user = context?.requestContext?.getRaw(MASTRA_NORMALIZED_USER_KEY);
  const agentId = context?.agent?.agentId;
  if (
    typeof resourceId !== 'string' ||
    !resourceId ||
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    typeof user.id !== 'string' ||
    !user.id ||
    !agentId
  ) {
    throw new AltflowToolError('AUTHENTICATION_REQUIRED', 'An authenticated account and agent context are required.');
  }
  return {
    userId: user.id,
    resourceId,
    agentId,
    threadId: context.agent?.threadId,
    toolCallId: context.agent?.toolCallId,
  };
}
