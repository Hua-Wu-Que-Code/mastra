import { useState } from 'react';
import type { ReactNode } from 'react';
import { createChatPreferencesStore } from './chat-preferences';
import { ChatPreferencesContext, ChatPreferencesValueContext } from './chat-preferences-context';
import type { ChatPreferencesValue } from './chat-preferences-context';

/** Key this provider by account identity when switching accounts. */
export function ChatPreferencesProvider({
  scope,
  children,
  value,
}: {
  scope: string;
  children: ReactNode;
  value?: ChatPreferencesValue;
}) {
  const [store] = useState(() => createChatPreferencesStore(scope));
  return (
    <ChatPreferencesValueContext.Provider value={value}>
      <ChatPreferencesContext.Provider value={store}>{children}</ChatPreferencesContext.Provider>
    </ChatPreferencesValueContext.Provider>
  );
}
