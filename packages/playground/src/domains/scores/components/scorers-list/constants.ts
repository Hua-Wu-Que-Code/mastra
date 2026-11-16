import { t as studioT } from '@mastra/playground-ui/lib/i18n';

export const SCORER_SOURCE_OPTIONS = [
  {
    value: 'all',
    get label() {
      return studioT('All sources');
    },
  },
  {
    value: 'code',
    get label() {
      return studioT('Code');
    },
  },
  {
    value: 'stored',
    get label() {
      return studioT('Stored');
    },
  },
] as const;
