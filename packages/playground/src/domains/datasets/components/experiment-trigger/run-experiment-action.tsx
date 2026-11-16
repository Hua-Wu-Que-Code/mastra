import { DialogAction } from '@mastra/playground-ui/components/Dialog';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export interface RunExperimentActionProps {
  onRun: () => void;
  canRun: boolean;
  isRunning: boolean;
}

export function RunExperimentAction({ onRun, canRun, isRunning }: RunExperimentActionProps) {
  return (
    <DialogAction onConfirm={onRun} disabled={!canRun}>
      <RunExperimentLabel isRunning={isRunning} />
    </DialogAction>
  );
}

function RunExperimentLabel({ isRunning }: { isRunning: boolean }) {
  useLocale();
  if (!isRunning) return 'Run experiment';

  return (
    <>
      <Spinner className="h-4 w-4" />
      {studioT('Starting…')}
    </>
  );
}
