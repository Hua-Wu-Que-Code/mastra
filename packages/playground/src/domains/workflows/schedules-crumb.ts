import { IconCalendarClock4 } from '@mastra/playground-ui/icons/central/IconCalendarClock4';
import { t as studioT } from '@mastra/playground-ui/lib/i18n';

import type { CrumbDef } from '@/domains/navigation/crumbs';

export const schedulesCrumb = {
  id: 'workflow-schedules',
  get label() {
    return studioT('Schedules');
  },
  icon: IconCalendarClock4,
  to: '/workflows/schedules',
} satisfies CrumbDef;
