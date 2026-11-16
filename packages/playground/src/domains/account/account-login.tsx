import { Button } from '@mastra/playground-ui/components/Button';
import { Input } from '@mastra/playground-ui/components/Input';
import { Label } from '@mastra/playground-ui/components/Label';
import { LogoWithoutText } from '@mastra/playground-ui/components/Logo';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountQueryKey, signIn } from './account-api';
import type { AccountEndpoint } from './account-api';

export function AccountLogin({ target }: { target: AccountEndpoint }) {
  useLocale();
  const queryClient = useQueryClient();
  const login = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => signIn(target, credentials),
    onSuccess: session => queryClient.setQueryData(accountQueryKey(target), { status: 'signed-in', session }),
  });
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        aria-label={studioT('Sign in')}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border bg-card p-8"
        onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          login.mutate({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') });
        }}
      >
        <LogoWithoutText className="mx-auto size-9" />
        <div className="space-y-2">
          <Label htmlFor="account-email">{studioT('Email')}</Label>
          <Input
            id="account-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={login.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-password">{studioT('Password')}</Label>
          <Input
            id="account-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={login.isPending}
          />
        </div>
        {login.error && <Txt role="alert">{login.error.message}</Txt>}
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? studioT('Signing in…') : studioT('Sign in')}
        </Button>
      </form>
    </main>
  );
}
