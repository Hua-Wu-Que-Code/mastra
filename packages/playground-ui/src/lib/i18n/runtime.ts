import { en } from './messages/en';
import { zh } from './messages/zh';

export type MessageKey = keyof typeof en;
export type Locale = 'en' | 'zh';
export type LocalePreference = Locale | 'auto';
export type TranslationParams = Readonly<Record<string, unknown>>;
export const LOCALE_STORAGE_KEY = 'mastra.studio.locale.v1';

const dictionaries: Record<Locale, Readonly<Record<MessageKey, string>>> = { en, zh };

function isPreference(value: string | undefined): value is LocalePreference {
  return value === 'en' || value === 'zh' || value === 'auto';
}

/** Match browser languages in preference order, including regional tags. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    if (primary === 'en' || primary === 'zh') return primary;
  }
  return 'en';
}

/** One browser's interface preference. It never changes model inputs or user content. */
export class LocaleRuntime {
  private active: Locale = 'en';
  private preference: LocalePreference = 'auto';
  private languages: readonly string[] = ['en'];
  private listeners = new Set<() => void>();

  getLocale = (): Locale => this.active;
  getPreference = (): LocalePreference => this.preference;
  getSnapshot = (): string => `${this.preference}:${this.active}`;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Adopt a browser or cross-tab preference without writing it back. */
  adopt(preference: LocalePreference, languages = this.languages): void {
    const previous = this.getSnapshot();
    this.languages = languages;
    this.preference = preference;
    this.active = preference === 'auto' ? detectLocale(languages) : preference;
    if (typeof document !== 'undefined') document.documentElement.lang = this.active === 'zh' ? 'zh-CN' : 'en';
    if (previous !== this.getSnapshot()) for (const listener of this.listeners) listener();
  }

  setLocale(preference: LocalePreference): void {
    this.adopt(preference);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_STORAGE_KEY, preference);
    } catch {
      // Browsers can disable storage. The selection still works for the current page.
    }
  }

  translate(key: MessageKey, params?: TranslationParams): string {
    const template = dictionaries[this.active][key] ?? en[key];
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : placeholder,
    );
  }
}

export const locale = new LocaleRuntime();
/** Locale tag for Intl formatters, resolved when formatting rather than at module load. */
export const getIntlLocale = (): string => (locale.getLocale() === 'zh' ? 'zh-CN' : 'en-US');
/** Resolve interface copy at call time, including event handlers and configuration getters. */
export const t = (key: MessageKey, params?: TranslationParams): string => locale.translate(key, params);

/** Initialize once before Studio renders. The returned disposer releases the cross-tab listener. */
export function initializeLocale(options: { languages?: readonly string[] } = {}): () => void {
  const languages = options.languages ?? (typeof navigator === 'undefined' ? ['en'] : navigator.languages);
  let preference: string | undefined;
  try {
    preference = window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined;
  } catch {
    // Privacy settings and non-browser consumers need no persistent storage.
  }
  locale.adopt(isPreference(preference) ? preference : 'auto', languages);
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    if (event.key !== LOCALE_STORAGE_KEY && event.key !== null) return;
    const next = event.newValue ?? undefined;
    locale.adopt(isPreference(next) ? next : 'auto');
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
