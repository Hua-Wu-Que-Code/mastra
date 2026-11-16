import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { useAccount, useAccountSignOut } from './account-context';

export function AccountMenu() {
  useLocale();
  const account = useAccount();
  const signOut = useAccountSignOut();
  const logout = useMutation({
    mutationFn: async () => {
      await signOut?.();
    },
  });
  if (!account) return undefined;
  return (
    <div className="space-y-2 px-3 py-2">
      <Txt variant="body-sm" className="truncate" title={account.user.email}>
        {account.user.name || account.user.email}
      </Txt>
      <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
        {logout.isPending ? studioT('Signing out…') : studioT('Sign out')}
      </Button>
      {logout.error && <Txt role="alert">{logout.error.message}</Txt>}
    </div>
  );
}
