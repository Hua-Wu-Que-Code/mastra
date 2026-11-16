import type { BadgeIndicator, BadgeVariant } from '@mastra/playground-ui/components/Badge';
import { t as studioT } from '@mastra/playground-ui/lib/i18n';

import type { StreamStatus } from '../../hooks/use-browser-stream';

type StreamStatusBadge = {
  variant: BadgeVariant;
  indicator: BadgeIndicator;
  label: string;
};

export const streamStatusBadges = {
  idle: {
    variant: 'neutral',
    indicator: 'dot',
    get label() {
      return studioT('Idle');
    },
  },
  connecting: {
    variant: 'warning',
    indicator: 'pulse',
    get label() {
      return studioT('Connecting');
    },
  },
  connected: {
    variant: 'warning',
    indicator: 'pulse',
    get label() {
      return studioT('Connected');
    },
  },
  browser_starting: {
    variant: 'warning',
    indicator: 'pulse',
    get label() {
      return studioT('Starting');
    },
  },
  streaming: {
    variant: 'success',
    indicator: 'dot',
    get label() {
      return studioT('Live');
    },
  },
  browser_closed: {
    variant: 'neutral',
    indicator: 'dot',
    get label() {
      return studioT('Closed');
    },
  },
  disconnected: {
    variant: 'destructive',
    indicator: 'pulse',
    get label() {
      return studioT('Disconnected');
    },
  },
  error: {
    variant: 'destructive',
    indicator: 'dot',
    get label() {
      return studioT('Error');
    },
  },
} satisfies Record<StreamStatus, StreamStatusBadge>;
