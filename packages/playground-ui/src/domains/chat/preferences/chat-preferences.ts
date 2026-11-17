import { createLocalStorageStore } from '@/hooks/use-local-storage-store';

export const CHAT_FONT_SIZE_MIN = 10;
export const CHAT_FONT_SIZE_MAX = 22;
export const WORK_DETAIL_MODES = ['compact', 'standard', 'detailed', 'verbose'] as const;
export type WorkDetailMode = (typeof WORK_DETAIL_MODES)[number];

export interface ChatPreferences {
  busyEnter: 'queue' | 'steer';
  fontSize: number;
  workDetails: WorkDetailMode;
  collapseTiming: 'completion' | 'next-input';
  foldedReplies: 'all' | 'final';
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  busyEnter: 'queue',
  fontSize: 14,
  workDetails: 'detailed',
  collapseTiming: 'completion',
  foldedReplies: 'all',
};

export function isWorkDetailMode(value: unknown): value is WorkDetailMode {
  return WORK_DETAIL_MODES.some(mode => mode === value);
}

function parsePreferences(stored: unknown): ChatPreferences {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_CHAT_PREFERENCES;
  const fontSize = 'fontSize' in stored ? stored.fontSize : undefined;
  return {
    busyEnter: 'busyEnter' in stored && stored.busyEnter === 'steer' ? 'steer' : 'queue',
    fontSize:
      typeof fontSize === 'number' &&
      Number.isInteger(fontSize) &&
      fontSize >= CHAT_FONT_SIZE_MIN &&
      fontSize <= CHAT_FONT_SIZE_MAX
        ? fontSize
        : DEFAULT_CHAT_PREFERENCES.fontSize,
    workDetails: 'workDetails' in stored && isWorkDetailMode(stored.workDetails) ? stored.workDetails : 'detailed',
    collapseTiming: 'collapseTiming' in stored && stored.collapseTiming === 'next-input' ? 'next-input' : 'completion',
    foldedReplies: 'foldedReplies' in stored && stored.foldedReplies === 'final' ? 'final' : 'all',
  };
}

/** Composer and presentation preferences stay separate from stored messages. Each account has its own browser-local scope. */
export function createChatPreferencesStore(scope: string) {
  return createLocalStorageStore({
    key: `mastra:chat-preferences:v1:${encodeURIComponent(scope)}`,
    defaultValue: DEFAULT_CHAT_PREFERENCES,
    parse: parsePreferences,
  });
}
