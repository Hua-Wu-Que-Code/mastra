import type { TraceDatePreset } from '../types';
import { EmptyState } from '@/ds/components/EmptyState';

import { t as studioT, useLocale } from '@/lib/i18n';
import { formatDate } from '@/utils/date-format';

const PRESET_LABELS: Record<Exclude<TraceDatePreset, 'all' | 'custom'>, string> = {
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

export interface NoTracesInfoProps {
  /** What the empty list holds. Defaults to `traces`. */
  resource?: 'traces' | 'spans' | 'threads';
  datePreset?: TraceDatePreset;
  dateFrom?: Date;
  dateTo?: Date;
}

function describeRange({ resource = 'traces', datePreset, dateFrom, dateTo }: NoTracesInfoProps): {
  title: string;
  description: string;
} {
  const resourceLabel = studioT(resource);
  const rangeTip = studioT('Pick a wider time range. Older {resource} may fall outside the current window.', {
    resource: resourceLabel,
  });
  if (datePreset && datePreset !== 'all' && datePreset !== 'custom') {
    return {
      title: studioT('No {value0} for {value1}', { value0: resourceLabel, value1: PRESET_LABELS[datePreset] }),
      description: rangeTip,
    };
  }
  if (dateFrom && dateTo) {
    return {
      title: studioT('No {value0} between {value1} and {value2}', {
        value0: resourceLabel,
        value1: formatDate(dateFrom, 'date-time'),
        value2: formatDate(dateTo, 'date-time'),
      }),
      description: rangeTip,
    };
  }
  if (dateFrom) {
    return {
      title: studioT('No {value0} since {value1}', {
        value0: resourceLabel,
        value1: formatDate(dateFrom, 'date-time'),
      }),
      description: rangeTip,
    };
  }
  return {
    title: studioT('No {value0} yet', { value0: resourceLabel }),
    description: studioT('{resource} will appear here once agents, workflows, or tools are executed.', {
      resource: resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1),
    }),
  };
}

export const NoTracesInfo = (props: NoTracesInfoProps = {}) => {
  useLocale();
  const { title, description } = describeRange(props);
  return <EmptyState titleSlot={title} descriptionSlot={description} variant="fill" />;
};
