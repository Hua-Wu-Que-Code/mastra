import { useState } from 'react';
import { CHAT_FONT_SIZE_MAX, CHAT_FONT_SIZE_MIN } from './chat-preferences';
import { useChatPreferences } from './chat-preferences-context';
import { Input } from '@/ds/components/Input';
import { t, useLocale } from '@/lib/i18n';

/** Preserve partial numeric edits; publish valid sizes immediately and normalize on blur. */
export function ChatFontSizeInput() {
  useLocale();
  const { preferences, updatePreferences } = useChatPreferences();
  const [draft, setDraft] = useState({ value: String(preferences.fontSize), accepted: preferences.fontSize });
  const value = draft.accepted === preferences.fontSize ? draft.value : String(preferences.fontSize);
  return (
    <Input
      aria-label={t('Font size')}
      type="number"
      min={CHAT_FONT_SIZE_MIN}
      max={CHAT_FONT_SIZE_MAX}
      step={1}
      value={value}
      className="w-20 text-center tabular-nums"
      onChange={event => {
        const next = event.target.valueAsNumber;
        const valid = Number.isInteger(next) && next >= CHAT_FONT_SIZE_MIN && next <= CHAT_FONT_SIZE_MAX;
        setDraft({ value: event.target.value, accepted: valid ? next : preferences.fontSize });
        if (valid) updatePreferences({ fontSize: next });
      }}
      onBlur={event => {
        const next = event.target.valueAsNumber;
        const fontSize = Number.isFinite(next)
          ? Math.min(CHAT_FONT_SIZE_MAX, Math.max(CHAT_FONT_SIZE_MIN, Math.round(next)))
          : preferences.fontSize;
        setDraft({ value: String(fontSize), accepted: fontSize });
        updatePreferences({ fontSize });
      }}
    />
  );
}
