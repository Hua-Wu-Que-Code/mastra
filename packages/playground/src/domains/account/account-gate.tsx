import { Button } from '@mastra/playground-ui/components/Button';
import { ThemeProvider } from '@mastra/playground-ui/components/ThemeProvider';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { accountQueryKey, getAccountSession, signOut } from './account-api';
import type { AccountEndpoint } from './account-api';
import { AccountContext, AccountSignOutContext } from './account-context';
import { AccountLogin } from './account-login';
import { PlaygroundQueryClient } from '@/lib/tanstack-query';

// This gate uses our Go account contract. Native Studio login/RBAC stays separate.
export function AccountGate({ children, ...target }: AccountEndpoint & { children: ReactNode }) {
  useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: accountQueryKey(target),
    queryFn: () => getAccountSession(target),
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  if (query.isPending) return <Txt>{studioT('Verifying sign-in…')}</Txt>;
  if (query.error)
    return (
      <ThemeProvider storageKey="mastra-studio-theme">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
          <Txt role="alert">{studioT('Sign-in service unavailable. Please retry.')}</Txt>
          <Button onClick={() => void query.refetch()}>{studioT('Retry')}</Button>
        </main>
      </ThemeProvider>
    );
  if (query.data.status === 'not-mounted') return <>{children}</>;
  if (query.data.status === 'signed-out')
    return (
      <ThemeProvider storageKey="mastra-studio-theme">
        <AccountLogin target={target} />
      </ThemeProvider>
    );
  const session = query.data.session;
  const logout = async () => {
    await signOut(target);
    queryClient.setQueryData(accountQueryKey(target), { status: 'signed-out' });
  };
  return (
    <AccountContext.Provider value={session}>
      <AccountSignOutContext.Provider value={logout}>
        {/* Never reuse one user's Studio query cache for another user. */}
        <PlaygroundQueryClient key={`${session.user.id}:${session.user.role}`}>{children}</PlaygroundQueryClient>
      </AccountSignOutContext.Provider>
    </AccountContext.Provider>
  );
}
