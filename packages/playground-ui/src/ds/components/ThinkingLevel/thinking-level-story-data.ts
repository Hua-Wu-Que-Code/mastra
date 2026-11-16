import type { ThinkingLevelOption } from './use-thinking-level-stop';
import { t as studioT } from '@/lib/i18n';

export type Level = 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const ALL_LEVELS: ThinkingLevelOption<Level>[] = [
  {
    value: 'off',
    get label() {
      return studioT('Off');
    },
    emphasis: 'muted',
  },
  {
    value: 'low',
    get label() {
      return studioT('Low');
    },
  },
  {
    value: 'medium',
    get label() {
      return studioT('Medium');
    },
  },
  {
    value: 'high',
    get label() {
      return studioT('High');
    },
  },
  {
    value: 'xhigh',
    get label() {
      return studioT('Extra high');
    },
    emphasis: 'warning',
  },
  {
    value: 'max',
    get label() {
      return studioT('Max');
    },
    emphasis: 'warning',
  },
];

export const LOW_HIGH_LEVELS = ALL_LEVELS.filter(level => ['off', 'low', 'high'].includes(level.value));
export const UP_TO_HIGH_LEVELS = ALL_LEVELS.filter(level => level.emphasis !== 'warning');
export const SONNET_LEVELS = ALL_LEVELS.filter(level => level.value !== 'xhigh');

export const DESCRIPTION = 'More thinking answers harder problems, slower and at a higher cost.';
