import { createContext, useContext } from 'react';
import { createChatPreferencesStore } from './chat-preferences';
import type { ChatPreferences } from './chat-preferences';
import { useLocalStorageStore } from '@/hooks/use-local-storage-store';

const fallbackStore = createChatPreferencesStore('local');
export const ChatPreferencesContext = createContext(fallbackStore);

export function useChatPreferences() {
  const store = useContext(ChatPreferencesContext);
  const preferences = useLocalStorageStore(store);
  const updatePreferences = (patch: Partial<ChatPreferences>) => store.write({ ...store.read(), ...patch });
  return { preferences, updatePreferences };
}
