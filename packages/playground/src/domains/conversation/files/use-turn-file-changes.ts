import { useQuery } from '@tanstack/react-query';
import { useAccount } from '@/domains/account/account-context';
import { getTurnFileChanges } from '@/domains/account/storage-api';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export function useTurnFileChanges(thread: string | undefined, enabled: boolean, running: boolean) {
  const target = useStudioConfig();
  const account = useAccount();
  return useQuery({
    queryKey: ['turn-file-changes', target.baseUrl, target.headers, account?.user.id, thread, running],
    queryFn: ({ signal }) => (thread ? getTurnFileChanges(target, thread, signal) : []),
    enabled: Boolean(enabled && account && target.baseUrl && thread && thread !== 'new' && !running),
    retry: false,
  });
}
