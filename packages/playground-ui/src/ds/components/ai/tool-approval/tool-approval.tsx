import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Activity, ActivityContent, ActivityHeader, ActivityIcon, ActivityTrigger } from '../activity';
import { presentTool, ToolCallArguments } from '../tool-call';
import { Badge } from '@/ds/components/Badge';
import type { BadgeVariant } from '@/ds/components/Badge';
import { Button } from '@/ds/components/Button';
import { Txt } from '@/ds/components/Txt';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';
import { IconCrossMedium } from '@/ds/icons/central/IconCrossMedium';
import { IconShieldCheck } from '@/ds/icons/central/IconShieldCheck';
import { t as studioT, useLocale } from '@/lib/i18n';

type ToolApprovalDecision = 'approved' | 'declined';

const approvalStates = {
  pending: {
    get label() {
      return studioT('Approval required');
    },
    variant: 'warning',
    icon: IconShieldCheck,
  },
  approved: {
    get label() {
      return studioT('Approved');
    },
    variant: 'success',
    icon: IconCheckmark2Medium,
  },
  declined: {
    get label() {
      return studioT('Declined');
    },
    variant: 'neutral',
    icon: IconCrossMedium,
  },
} satisfies Record<'pending' | ToolApprovalDecision, { label: string; variant: BadgeVariant; icon: LucideIcon }>;

export interface ToolApprovalStatusProps {
  status?: ToolApprovalDecision;
}

export function ToolApprovalStatus({ status }: ToolApprovalStatusProps) {
  const { label, variant, icon: StatusIcon } = approvalStates[status ?? 'pending'];
  return (
    <span role="status" className="inline-flex shrink-0">
      <Badge variant={variant} emphasis="subtle" size="sm" icon={<StatusIcon aria-hidden />}>
        {label}
      </Badge>
    </span>
  );
}

export interface ToolApprovalActionsProps {
  onApprove: () => void;
  onDecline: () => void;
  disabled?: boolean;
  toolName?: string;
  autoFocus?: boolean;
}

export function ToolApprovalActions({
  onApprove,
  onDecline,
  disabled = false,
  toolName,
  autoFocus = false,
}: ToolApprovalActionsProps) {
  useLocale();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        icon={<IconCheckmark2Medium aria-hidden />}
        aria-label={toolName ? studioT('Approve {value0}', { value0: toolName }) : undefined}
        autoFocus={autoFocus}
        disabled={disabled}
        onClick={onApprove}
      >
        {studioT('Approve')}
      </Button>
      <Button
        type="button"
        size="sm"
        icon={<IconCrossMedium aria-hidden />}
        aria-label={toolName ? studioT('Decline {value0}', { value0: toolName }) : undefined}
        disabled={disabled}
        onClick={onDecline}
      >
        {studioT('Decline')}
      </Button>
    </div>
  );
}

export interface ToolApprovalProps extends ToolApprovalActionsProps, ToolApprovalStatusProps {
  toolName: string;
  args?: unknown;
  /** Custom details replace the default argument renderer. */
  children?: ReactNode;
}

export function ToolApproval({ toolName, args, status, children, ...actions }: ToolApprovalProps) {
  useLocale();
  const { icon: ToolIcon } = presentTool(toolName, args);

  return (
    <Activity
      open
      foldable={false}
      className="my-2"
      aria-label={studioT('Tool approval for {value0}', { value0: toolName })}
    >
      <ActivityTrigger>
        <ActivityHeader className="flex-wrap">
          <ActivityIcon>
            <ToolIcon aria-hidden />
          </ActivityIcon>
          <Txt as="span" variant="caption" tone="muted" font="mono" className="min-w-0 break-all">
            {toolName}
          </Txt>
          <ToolApprovalStatus status={status} />
        </ActivityHeader>
      </ActivityTrigger>
      <ActivityContent>
        {children ?? <ToolCallArguments toolName={toolName} args={args} showFullContent />}
        {!status && <ToolApprovalActions toolName={toolName} {...actions} />}
      </ActivityContent>
    </Activity>
  );
}
