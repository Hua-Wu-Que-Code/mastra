import { Button } from '@mastra/playground-ui/components/Button';
import { useTheme } from '@mastra/playground-ui/components/ThemeProvider';
import { IconMoon } from '@mastra/playground-ui/icons/central/IconMoon';
import { IconStudioDisplay } from '@mastra/playground-ui/icons/central/IconStudioDisplay';
import { IconSun } from '@mastra/playground-ui/icons/central/IconSun';
import { t, useLocale } from '@mastra/playground-ui/lib/i18n';
import { SettingsFieldsetRow } from '@mastra/playground-ui/new/settings';

/** Use the same persisted theme as the app, with all three choices visible. */
export function AppearanceSettings() {
  useLocale();
  const { theme, setTheme } = useTheme();
  const optionClass =
    'h-24 min-w-0 flex-col gap-2 rounded-xl border-border text-foreground aria-pressed:border-border-focus aria-pressed:bg-fill-subtle [&_svg]:size-5';

  return (
    <SettingsFieldsetRow label={t('Appearance')} controlPlacement="below">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="ghost"
          className={optionClass}
          aria-pressed={theme === 'light'}
          onClick={() => setTheme('light')}
        >
          <IconSun aria-hidden />
          {t('Light')}
        </Button>
        <Button
          variant="ghost"
          className={optionClass}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme('dark')}
        >
          <IconMoon aria-hidden />
          {t('Dark')}
        </Button>
        <Button
          variant="ghost"
          className={optionClass}
          aria-pressed={theme === 'system'}
          onClick={() => setTheme('system')}
        >
          <IconStudioDisplay aria-hidden />
          {t('Follow system')}
        </Button>
      </div>
    </SettingsFieldsetRow>
  );
}
