import { ChatFontSizeInput } from './chat-font-size-input';
import { isWorkDetailMode } from './chat-preferences';
import { useChatPreferences } from './chat-preferences-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/components/Select';
import { Txt } from '@/ds/components/Txt';
import { SettingsRow } from '@/ds/new/settings';
import { t, useLocale } from '@/lib/i18n';

export function ChatPreferencesSettings() {
  useLocale();
  const { preferences, updatePreferences } = useChatPreferences();
  return (
    <>
      <SettingsRow label={t('Font size')} description={t('Only affects conversation content.')}>
        <div className="flex items-center gap-2">
          <ChatFontSizeInput />
          <Txt as="span" variant="caption" tone="muted">
            {t('px')}
          </Txt>
        </div>
      </SettingsRow>
      <SettingsRow label={t('Work details')} description={t('Choose how much tool-call detail to show.')}>
        <Select
          value={preferences.workDetails}
          onValueChange={value => {
            if (isWorkDetailMode(value)) updatePreferences({ workDetails: value });
          }}
        >
          <SelectTrigger aria-label={t('Work details')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="compact">{t('Compact')}</SelectItem>
            <SelectItem value="standard">{t('Standard')}</SelectItem>
            <SelectItem value="detailed">{t('Detailed')}</SelectItem>
            <SelectItem value="verbose">{t('Fully expanded')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow
        label={t('Collapse work details')}
        description={t('Choose when work details automatically collapse.')}
      >
        <Select
          value={preferences.collapseTiming}
          disabled={preferences.workDetails === 'verbose'}
          onValueChange={value => {
            if (value === 'completion' || value === 'next-input') updatePreferences({ collapseTiming: value });
          }}
        >
          <SelectTrigger aria-label={t('Collapse work details')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="completion">{t('After the answer finishes')}</SelectItem>
            <SelectItem value="next-input">{t('On next message')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      {preferences.workDetails !== 'verbose' && (
        <SettingsRow
          label={t('Replies when collapsed')}
          description={t('Choose which assistant replies remain visible.')}
        >
          <Select
            value={preferences.foldedReplies}
            onValueChange={value => {
              if (value === 'all' || value === 'final') updatePreferences({ foldedReplies: value });
            }}
          >
            <SelectTrigger aria-label={t('Replies when collapsed')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">{t('All replies')}</SelectItem>
              <SelectItem value="final">{t('Final answer only')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      )}
    </>
  );
}
