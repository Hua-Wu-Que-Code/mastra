import { useState } from 'react';
import type { ReactNode } from 'react';
import { createChatPreferencesStore } from './chat-preferences';
import { ChatPreferencesContext } from './chat-preferences-context';

/** Key this provider by account identity when switching accounts. */
export function ChatPreferencesProvider({ scope, children }: { scope: string; children: ReactNode }) {
  const [store] = useState(() => createChatPreferencesStore(scope));
  return <ChatPreferencesContext.Provider value={store}>{children}</ChatPreferencesContext.Provider>;
}
