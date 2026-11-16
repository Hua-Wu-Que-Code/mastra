import { t as studioT } from '@mastra/playground-ui/lib/i18n';
import type { UIExperimentConfig } from './experimental-ui-context';

export const UI_EXPERIMENTS: UIExperimentConfig[] = [
  {
    key: 'entity-list-page',
    name: 'Entity List page UI',
    path: ['/agents', '/prompts', '/tools', '/datasets', '/scorers', '/mcps', '/workflows', '/processors'],
    variants: [
      {
        value: 'current',
        get label() {
          return studioT('Current state');
        },
      },
      {
        value: 'new-proposal',
        get label() {
          return studioT('New proposal');
        },
      },
    ],
  },
];
