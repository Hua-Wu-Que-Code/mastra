import type { FilterBarOperator } from './types';
import { t as studioT } from '@/lib/i18n';

/** Opt-in starter set. Pure data: the component attaches no semantics to ids. */
export const DEFAULT_FILTER_OPERATORS: FilterBarOperator[] = [
  {
    id: 'is',
    get label() {
      return studioT('is');
    },
    widensTo: 'in',
  },
  {
    id: 'is-not',
    get label() {
      return studioT('is not');
    },
  },
  {
    id: 'contains',
    get label() {
      return studioT('contains');
    },
  },
  {
    id: 'not-contains',
    get label() {
      return studioT('does not contain');
    },
  },
  {
    id: 'starts-with',
    get label() {
      return studioT('starts with');
    },
  },
  { id: 'gt', label: '>' },
  { id: 'lt', label: '<' },
  { id: 'gte', label: '>=' },
  { id: 'lte', label: '<=' },
  {
    id: 'is-empty',
    get label() {
      return studioT('is empty');
    },
    arity: 'none',
  },
  {
    id: 'is-not-empty',
    get label() {
      return studioT('is not empty');
    },
    arity: 'none',
  },
  {
    id: 'in',
    get label() {
      return studioT('in');
    },
    arity: 'many',
  },
];
