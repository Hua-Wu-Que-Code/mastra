import { DropdownMenu } from '@/ds/components/DropdownMenu';
import { IconArrowRotateCounterClockwise } from '@/ds/icons/central/IconArrowRotateCounterClockwise';
import { IconClock } from '@/ds/icons/central/IconClock';
import { IconCodeBrackets } from '@/ds/icons/central/IconCodeBrackets';
import { IconExclamationCircle } from '@/ds/icons/central/IconExclamationCircle';
import { IconPlay } from '@/ds/icons/central/IconPlay';
import { IconShield2 } from '@/ds/icons/central/IconShield2';
import { IconSidebarSimpleRightWide } from '@/ds/icons/central/IconSidebarSimpleRightWide';
import { IconStepForwards } from '@/ds/icons/central/IconStepForwards';
import { t as studioT } from '@/lib/i18n';

const actions = {
  nested: {
    icon: IconSidebarSimpleRightWide,
    get label() {
      return studioT('View nested graph');
    },
    activeLabel: 'Hide nested graph',
  },
  map: {
    icon: IconCodeBrackets,
    get label() {
      return studioT('Map config');
    },
    activeLabel: 'Hide map config',
  },
  timeTravel: {
    icon: IconClock,
    get label() {
      return studioT('Time travel');
    },
  },
  runStep: {
    icon: IconPlay,
    get label() {
      return studioT('Run step');
    },
  },
  continueRun: {
    icon: IconStepForwards,
    get label() {
      return studioT('Continue run');
    },
  },
  resumeData: {
    icon: IconArrowRotateCounterClockwise,
    get label() {
      return studioT('Resume data');
    },
  },
  error: {
    icon: IconExclamationCircle,
    get label() {
      return studioT('Error');
    },
  },
  tripwire: {
    icon: IconShield2,
    get label() {
      return studioT('Tripwire');
    },
  },
};

export interface WorkflowStepActionProps {
  action: keyof typeof actions;
  isActive?: boolean;
  onSelect: () => void;
}

export function WorkflowStepAction({ action, isActive, onSelect }: WorkflowStepActionProps) {
  const definition = actions[action];
  const ActionIcon = definition.icon;
  const label = isActive && 'activeLabel' in definition ? definition.activeLabel : definition.label;
  return (
    <DropdownMenu.Item onSelect={onSelect} className={action === 'tripwire' ? 'text-warning-foreground' : undefined}>
      <ActionIcon />
      <span>{label}</span>
    </DropdownMenu.Item>
  );
}
