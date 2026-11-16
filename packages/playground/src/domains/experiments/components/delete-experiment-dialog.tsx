'use client';

import { AlertDialog } from '@mastra/playground-ui/components/AlertDialog';
import { Button } from '@mastra/playground-ui/components/Button';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDatasetMutations } from '@mastra/react/hooks/datasets';

export interface DeleteExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experimentId: string;
  experimentName?: string;
  onSuccess?: () => void;
}

export function DeleteExperimentDialog({
  open,
  onOpenChange,
  experimentId,
  experimentName,
  onSuccess,
}: DeleteExperimentDialogProps) {
  useLocale();
  const { deleteExperiment } = useDatasetMutations();

  const handleDelete = async () => {
    try {
      await deleteExperiment.mutateAsync(experimentId);
      toast.success(studioT('Experiment deleted successfully'));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        studioT('Failed to delete experiment: {value0}', {
          value0: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{studioT('Delete Experiment')}</AlertDialog.Title>
          <AlertDialog.Description>
            {studioT('Are you sure you want to delete "')}
            {experimentName || experimentId}
            {studioT(
              '"? This will permanently delete the experiment, all its results, and the traces it produced, including their spans and any scores, feedback, metrics and logs attached to those traces. This action cannot be undone.',
            )}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>{studioT('Cancel')}</AlertDialog.Cancel>
          <Button icon={<TrashIcon />} variant="primary" onClick={handleDelete} disabled={deleteExperiment.isPending}>
            {deleteExperiment.isPending ? studioT('Deleting...') : studioT('Delete')}
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
