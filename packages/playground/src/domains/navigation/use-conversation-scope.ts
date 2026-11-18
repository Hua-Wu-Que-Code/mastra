import { useMastraClient } from '@mastra/react';
import { isAuthenticated, useAuthCapabilities } from '@mastra/react/hooks/auth';
import { useAccount } from '@/domains/account/account-context';

/** Keep organization and list caches isolated by server and signed-in account. */
export function useConversationScope() {
  const account = useAccount();
  const client = useMastraClient();
  const { data: auth } = useAuthCapabilities();
  const userId = account?.user.id ?? (auth && isAuthenticated(auth) ? auth.user.id : 'local');
  return JSON.stringify([client.options.baseUrl, client.options.apiPrefix, userId]);
}
