import { useChatPreferences } from './chat-preferences-context';
import { Button } from '@/ds/components/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/components/Select';
import { Switch } from '@/ds/components/Switch';
import { SettingsContainer, SettingsGroup, SettingsRow, SettingsTitle } from '@/ds/new/settings';
import { t, useLocale } from '@/lib/i18n';

export function EditorPreferencesSettings() {
  useLocale();
  const { preferences, updatePreferences } = useChatPreferences();
  const oppositeShortcut = preferences.sendShortcut === 'enter' ? 'Cmd/Ctrl+Enter' : 'Cmd/Ctrl+Shift+Enter';
  return (
    <SettingsGroup>
      <SettingsTitle>{t('Editor')}</SettingsTitle>
      <SettingsContainer className="border border-border">
        <SettingsRow
          label={t('Plain text editor')}
          description={t('Keep code, Markdown, and links as plain text while composing messages.')}
        >
          <Switch
            aria-label={t('Plain text editor')}
            checked={preferences.plainText}
            onCheckedChange={plainText => updatePreferences({ plainText })}
          />
        </SettingsRow>
        <SettingsRow label={t('Show context window usage')}>
          <Switch
            aria-label={t('Show context window usage')}
            checked={preferences.showContextUsage}
            onCheckedChange={showContextUsage => updatePreferences({ showContextUsage })}
          />
        </SettingsRow>
        <SettingsRow
          label={t('Send shortcut')}
          description={t('Choose whether Enter sends your message or inserts a new line.')}
        >
          <Select
            value={preferences.sendShortcut}
            onValueChange={value => {
              if (value === 'enter' || value === 'mod-enter') updatePreferences({ sendShortcut: value });
            }}
          >
            <SelectTrigger aria-label={t('Send shortcut')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="enter">{t('Enter')}</SelectItem>
              <SelectItem value="mod-enter">{t('Cmd/Ctrl+Enter')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label={t('Follow-up messages')}
          description={t(
            'Queue follow-up messages while the agent runs, or steer the current run. {shortcut} uses the opposite behavior.',
            { shortcut: oppositeShortcut },
          )}
        >
          <div
            role="group"
            aria-label={t('Follow-up messages')}
            className="flex shrink-0 gap-1 rounded-full bg-fill-subtle p-1"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full aria-pressed:bg-fill-hover"
              aria-pressed={preferences.busyEnter === 'queue'}
              onClick={() => updatePreferences({ busyEnter: 'queue' })}
            >
              {t('Queue')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full aria-pressed:bg-fill-hover"
              aria-pressed={preferences.busyEnter === 'steer'}
              onClick={() => updatePreferences({ busyEnter: 'steer' })}
            >
              {t('Steer')}
            </Button>
          </div>
        </SettingsRow>
      </SettingsContainer>
    </SettingsGroup>
  );
}
