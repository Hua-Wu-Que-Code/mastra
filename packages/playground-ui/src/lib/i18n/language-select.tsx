import { useTranslation } from './index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/components/Select';

/** Browser-local interface preference, using Studio's existing settings control. */
export function LanguageSelect() {
  const { t, preference, setLocale } = useTranslation();
  return (
    <Select
      value={preference}
      onValueChange={value => {
        if (value === 'en' || value === 'zh' || value === 'auto') setLocale(value);
      }}
    >
      <SelectTrigger aria-label={t('Language')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="auto">{t('Follow browser')}</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectContent>
    </Select>
  );
}
