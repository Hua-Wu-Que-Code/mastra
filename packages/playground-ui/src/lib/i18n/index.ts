import { useSyncExternalStore } from 'react';
import { locale, t } from './runtime';

export { detectLocale, getIntlLocale, initializeLocale, locale, LOCALE_STORAGE_KEY, LocaleRuntime, t } from './runtime';
export type { Locale, LocalePreference, MessageKey, TranslationParams } from './runtime';

/** Subscribe without replacing component identity, input state, or active streams. */
export function useLocale() {
  useSyncExternalStore(locale.subscribe, locale.getSnapshot, locale.getSnapshot);
  return locale.getLocale();
}

export function useTranslation() {
  useLocale();
  return {
    locale: locale.getLocale(),
    preference: locale.getPreference(),
    t,
    setLocale: locale.setLocale.bind(locale),
  };
}
