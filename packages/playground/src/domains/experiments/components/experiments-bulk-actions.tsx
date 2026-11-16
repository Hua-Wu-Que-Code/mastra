import { Button } from '@mastra/playground-ui/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@mastra/playground-ui/components/Tooltip';
import { IconChanges } from '@mastra/playground-ui/icons/central/IconChanges';
import { IconCrossMedium } from '@mastra/playground-ui/icons/central/IconCrossMedium';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { DeleteExperimentsButton } from './delete-experiments-button';

export interface ExperimentsBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onCompare: () => void;
  /** When set, Compare is disabled and this reason is shown in its tooltip. */
  compareDisabledReason?: string;
}

/** Selection count (a button clearing the selection once non-empty), plus Delete and Compare — always shown, Compare explained when disabled. */
export function ExperimentsBulkActions({
  selectedIds,
  onClearSelection,
  onCompare,
  compareDisabledReason,
}: ExperimentsBulkActionsProps) {
  useLocale();
  const selectedCount = selectedIds.length;
  const isEmpty = selectedCount === 0;

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <Button
        variant="ghost"
        size="sm"
        disabled={isEmpty}
        iconEnd={isEmpty ? undefined : <IconCrossMedium />}
        onClick={onClearSelection}
        tooltip={isEmpty ? undefined : studioT('Clear selection')}
        className="mr-2 tabular-nums"
      >
        {selectedCount} {' ' + studioT('selected')}
      </Button>
      <DeleteExperimentsButton experimentIds={selectedIds} onDeleted={onClearSelection} />
      {compareDisabledReason ? (
        // A disabled button swallows pointer and focus events, so the wrapper owns the tooltip.
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-not-allowed" tabIndex={0} />}>
            <Button size="sm" disabled tabIndex={-1} icon={<IconChanges />}>
              {studioT('Compare')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{compareDisabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        <Button size="sm" onClick={onCompare} icon={<IconChanges />}>
          {studioT('Compare')}
        </Button>
      )}
    </div>
  );
}
