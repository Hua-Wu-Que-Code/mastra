// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LanguageSelect } from './language-select';
import { Trans } from './trans';
import { initializeLocale, locale, useTranslation, LOCALE_STORAGE_KEY } from './index';
import { formatDate } from '@/utils/date-format';

function ConversationDraft() {
  const { t } = useTranslation();
  return (
    <label>
      {t('Language')}
      <input aria-label={t('Enter your message')} defaultValue="正在写的草稿" />
    </label>
  );
}

beforeAll(() => {
  if (window.PointerEvent === undefined) {
    Object.defineProperty(window, 'PointerEvent', { value: window.MouseEvent, configurable: true });
  }
});

afterEach(() => {
  act(() => locale.setLocale('en'));
  localStorage.clear();
});

describe('Studio locale', () => {
  describe('when the user changes languages while writing', () => {
    it('updates labels without losing the draft or remounting the input', () => {
      render(<ConversationDraft />);
      const input = screen.getByRole('textbox', { name: 'Enter your message' });
      fireEvent.change(input, { target: { value: '未发送的中文内容' } });
      act(() => locale.setLocale('zh'));
      expect(screen.getByText('语言')).toBeTruthy();
      expect(screen.getByRole('textbox', { name: '输入消息' })).toBe(input);
      expect(input).toHaveProperty('value', '未发送的中文内容');
    });
  });
  describe('when the browser requests a regional Chinese locale', () => {
    it('selects Chinese and synchronizes the document language', () => {
      const dispose = initializeLocale({ languages: ['zh-CN', 'en-US'] });
      expect(locale.getLocale()).toBe('zh');
      expect(document.documentElement.lang).toBe('zh-CN');
      dispose();
    });
  });
  describe('when a language choice has already been saved', () => {
    it('uses the saved choice instead of the browser language', () => {
      locale.setLocale('en');
      const dispose = initializeLocale({ languages: ['zh-CN'] });
      expect(locale.getLocale()).toBe('en');
      dispose();
    });
  });
});

describe('LanguageSelect', () => {
  describe('when a reader chooses Chinese', () => {
    it('persists the choice and updates the selector immediately', async () => {
      render(<LanguageSelect />);
      fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
      const chinese = await screen.findByRole('option', { name: '中文' });
      fireEvent.pointerDown(chinese, { pointerType: 'mouse' });
      fireEvent.click(chinese, { detail: 1 });
      expect(screen.getByRole('combobox', { name: '语言' }).textContent).toContain('中文');
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh');
    });
  });
  describe('when another tab clears the preference', () => {
    it('returns to the browser language', () => {
      const dispose = initializeLocale({ languages: ['zh-CN'] });
      act(() => locale.setLocale('en'));
      act(() =>
        window.dispatchEvent(
          new StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: null, storageArea: localStorage }),
        ),
      );
      expect(locale.getLocale()).toBe('zh');
      dispose();
    });
  });
  describe('when storage contains an unsupported language', () => {
    it('uses the browser language', () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'unsupported');
      const dispose = initializeLocale({ languages: ['zh-TW'] });
      expect(locale.getLocale()).toBe('zh');
      dispose();
    });
  });
});

describe('Trans', () => {
  describe('when Chinese changes the position of an emphasized value', () => {
    it('preserves the React node and escapes user content', () => {
      act(() => locale.setLocale('zh'));
      const { container } = render(
        <Trans
          id="What can {part0} do for you today?"
          values={{ part0: <strong>{'<script>alert(1)</script>'}</strong> }}
        />,
      );
      expect(container.textContent).toBe('今天希望<script>alert(1)</script>帮你做些什么？');
      expect(container.querySelector('strong')?.textContent).toBe('<script>alert(1)</script>');
      expect(container.querySelector('script')).toBeNull();
    });
  });
});

describe('localized dates', () => {
  describe('when the interface uses Chinese', () => {
    it('formats relative time in Chinese', () => {
      act(() => locale.setLocale('zh'));
      const now = new Date('2026-11-16T08:00:00Z');
      expect(formatDate(new Date(now.getTime() - 120_000), 'relative-time', { now })).toBe('2分钟前');
      expect(formatDate(new Date(now.getTime() - 120_000), 'relative-time', { now, locale: 'en-US' })).toBe('2m ago');
    });
  });
});
