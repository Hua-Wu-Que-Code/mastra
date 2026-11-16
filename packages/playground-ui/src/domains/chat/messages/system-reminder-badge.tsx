import { useMemo } from 'react';
import { parseSystemReminder } from './system-reminder-utils';
import { SignalActivity } from '@/ds/components/ai/activity';
import { t as studioT, useLocale } from '@/lib/i18n';

export interface SystemReminderBadgeProps {
  text: string;
}

export const SystemReminderBadge = ({ text }: SystemReminderBadgeProps) => {
  useLocale();
  const reminder = useMemo(() => parseSystemReminder(text), [text]);

  if (!reminder) {
    return text;
  }

  return (
    <SignalActivity
      kind="reminder"
      label={studioT('System reminder')}
      detail={reminder.path || reminder.type}
      message={reminder.body}
    />
  );
};
