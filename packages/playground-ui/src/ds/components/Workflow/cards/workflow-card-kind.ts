import type { WorkflowStepCardViewProps } from '../types';
import type { WorkflowCardIcon } from './workflow-card-badge-utils';
import type { BadgeVariant } from '@/ds/components/Badge';
import { IconArrowRightLeft } from '@/ds/icons/central/IconArrowRightLeft';
import { IconArrowsRepeat } from '@/ds/icons/central/IconArrowsRepeat';
import { IconBranch } from '@/ds/icons/central/IconBranch';
import { IconCalendarClock4 } from '@/ds/icons/central/IconCalendarClock4';
import { IconCodeBrackets } from '@/ds/icons/central/IconCodeBrackets';
import { IconFork } from '@/ds/icons/central/IconFork';
import { IconMaintenance } from '@/ds/icons/central/IconMaintenance';
import { IconRobot } from '@/ds/icons/central/IconRobot';
import { IconStopwatch } from '@/ds/icons/central/IconStopwatch';
import { WorkflowIcon } from '@/ds/icons/WorkflowIcon';
import { t as studioT } from '@/lib/i18n';

export type WorkflowTypeBadgeProps = Pick<
  WorkflowStepCardViewProps,
  'nodeKind' | 'isForEach' | 'isNestedWorkflowStep' | 'stepGraph' | 'isParallel' | 'mapConfig' | 'date' | 'duration'
>;

export function getWorkflowCardBadge(props: WorkflowTypeBadgeProps): {
  label: string;
  Icon: WorkflowCardIcon;
  tone: BadgeVariant;
  indicator?: string;
} {
  if (props.isForEach)
    return {
      get label() {
        return studioT('For each');
      },
      tone: 'orange',
      Icon: IconArrowsRepeat,
      indicator: 'foreach',
    };
  if (props.isNestedWorkflowStep || props.stepGraph)
    return {
      get label() {
        return studioT('Workflow');
      },
      tone: 'purple',
      Icon: WorkflowIcon,
      indicator: 'workflow',
    };
  if (props.isParallel && !props.nodeKind)
    return {
      get label() {
        return studioT('Parallel');
      },
      tone: 'blue',
      Icon: IconFork,
      indicator: 'parallel',
    };
  if (props.nodeKind === 'map' || props.mapConfig)
    return {
      get label() {
        return studioT('Map');
      },
      tone: 'orange',
      Icon: IconArrowRightLeft,
      indicator: 'map',
    };
  if (props.nodeKind === 'wait-until' || props.date)
    return {
      get label() {
        return studioT('Wait until');
      },
      tone: 'purple',
      Icon: IconCalendarClock4,
      indicator: 'sleep-until',
    };
  if (props.nodeKind === 'delay' || props.duration !== undefined)
    return {
      get label() {
        return studioT('Delay');
      },
      tone: 'purple',
      Icon: IconStopwatch,
      indicator: 'sleep',
    };
  if (props.nodeKind === 'agent')
    return {
      get label() {
        return studioT('Agent');
      },
      tone: 'cyan',
      Icon: IconRobot,
    };
  if (props.nodeKind === 'tool')
    return {
      get label() {
        return studioT('Tool');
      },
      tone: 'pink',
      Icon: IconMaintenance,
    };
  if (props.nodeKind === 'classifier')
    return {
      get label() {
        return studioT('Classifier');
      },
      tone: 'blue',
      Icon: IconBranch,
    };
  return {
    get label() {
      return studioT('Step');
    },
    tone: 'neutral',
    Icon: IconCodeBrackets,
  };
}
