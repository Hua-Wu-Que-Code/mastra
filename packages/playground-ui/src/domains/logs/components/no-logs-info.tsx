import type { LogsDatePreset } from '../log-filters';
import { Button } from '@/ds/components/Button';
import { EmptyState } from '@/ds/components/EmptyState';
import { IconSquareArrowTopRight } from '@/ds/icons/central/IconSquareArrowTopRight';

import { t as studioT, useLocale } from '@/lib/i18n';
import { formatDate } from '@/utils/date-format';

const PRESET_LABELS: Record<Exclude<LogsDatePreset, 'all' | 'custom'>, string> = {
  get 'last-24h'() {
    return studioT('the last 24 hours');
  },
  get 'last-3d'() {
    return studioT('the last 3 days');
  },
  get 'last-7d'() {
    return studioT('the last 7 days');
  },
  get 'last-14d'() {
    return studioT('the last 14 days');
  },
  get 'last-30d'() {
    return studioT('the last 30 days');
  },
};

export interface NoLogsInfoProps {
  datePreset?: LogsDatePreset;
  dateFrom?: Date;
  dateTo?: Date;
}

const LEVEL_TIP = () =>
  studioT('Pick a wider range or lower the logging level. Verbose entries (debug, info) may be filtered out.');

function describeRange({ datePreset, dateFrom, dateTo }: NoLogsInfoProps): { title: string; description: string } {
  if (datePreset && datePreset !== 'all' && datePreset !== 'custom') {
    return {
      title: studioT('No logs for {value0}', { value0: PRESET_LABELS[datePreset] }),
      description: LEVEL_TIP(),
    };
  }
  if (dateFrom && dateTo) {
    return {
      title: studioT('No logs between {value0} and {value1}', {
        value0: formatDate(dateFrom, 'date-time'),
        value1: formatDate(dateTo, 'date-time'),
      }),
      description: LEVEL_TIP(),
    };
  }
  if (dateFrom) {
    return {
      title: studioT('No logs since {value0}', { value0: formatDate(dateFrom, 'date-time') }),
      description: LEVEL_TIP(),
    };
  }
  return {
    get title() {
      return studioT('No logs yet');
    },
    get description() {
      return studioT('Logs will appear here once agents, workflows, or tools are executed.');
    },
  };
}

export const NoLogsInfo = ({ datePreset, dateFrom, dateTo }: NoLogsInfoProps = {}) => {
  useLocale();
  const { title, description } = describeRange({ datePreset, dateFrom, dateTo });
  return (
    <EmptyState
      titleSlot={title}
      descriptionSlot={description}
      actionSlot={
        <Button
          variant="ghost"
          render={
            <a href="https://mastra.ai/en/docs/observability/logging" target="_blank" rel="noopener noreferrer" />
          }
          icon={<IconSquareArrowTopRight />}
        >
          {studioT('Logging documentation')}
        </Button>
      }
      variant="fill"
    />
  );
};
