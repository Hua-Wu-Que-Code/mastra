import { createContext, useContext } from 'react';
import { createChatPreferencesStore } from './chat-preferences';
import type { ChatPreferences } from './chat-preferences';
import { useLocalStorageStore } from '@/hooks/use-local-storage-store';

const fallbackStore = createChatPreferencesStore('local');
export const ChatPreferencesContext = createContext(fallbackStore);
export interface ChatPreferencesValue {
  preferences: ChatPreferences;
  updatePreferences: (patch: Partial<ChatPreferences>) => void;
}
export const ChatPreferencesValueContext = createContext<ChatPreferencesValue | undefined>(undefined);

export function useChatPreferences() {
  const store = useContext(ChatPreferencesContext);
  const preferences = useLocalStorageStore(store);
  const updatePreferences = (patch: Partial<ChatPreferences>) => store.write({ ...store.read(), ...patch });
  const controlled = useContext(ChatPreferencesValueContext);
  return controlled ?? { preferences, updatePreferences };
}
