import { Button } from '@mastra/playground-ui/components/Button';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { ChatPreferencesProvider, chatPreferencesSchema } from '@mastra/playground-ui/domains/chat';
import { useServerPreference } from '@mastra/playground-ui/hooks/use-server-preference';
import { t } from '@mastra/playground-ui/lib/i18n';
import type { ReactNode } from 'react';
import { useAccount } from './account-context';

export function AccountChatPreferences({ scope, children }: { scope: string; children: ReactNode }) {
  const account = useAccount();
  if (!account) return <ChatPreferencesProvider scope={scope}>{children}</ChatPreferencesProvider>;
  return <ManagedChatPreferences accountId={account.user.id}>{children}</ManagedChatPreferences>;
}

function ManagedChatPreferences({ accountId, children }: { accountId: string; children: ReactNode }) {
  const saved = useServerPreference({
    kind: 'chat',
    id: 'global',
    accountId,
    schema: chatPreferencesSchema,
    defaultValue: chatPreferencesSchema.parse({}),
    legacyKey: `mastra:chat-preferences:v1:${encodeURIComponent(accountId)}`,
  });
  if (saved.isLoading) return <Txt tone="muted">{t('Loading...')}</Txt>;
  if (saved.error) return <Button onClick={saved.retry}>{t('Retry')}</Button>;
  return (
    <ChatPreferencesProvider
      scope={accountId}
      value={{
        preferences: saved.value,
        updatePreferences: patch => saved.setValue(current => ({ ...current, ...patch })),
      }}
    >
      {children}
    </ChatPreferencesProvider>
  );
}
