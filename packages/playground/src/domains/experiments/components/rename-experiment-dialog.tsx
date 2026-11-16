import type { DatasetExperiment } from '@mastra/client-js';
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogCancel,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mastra/playground-ui/components/Dialog';
import { Field, FieldLabel } from '@mastra/playground-ui/components/Field';
import { Form } from '@mastra/playground-ui/components/Form';
import { Input } from '@mastra/playground-ui/components/Input';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useDatasetMutations } from '@mastra/react/hooks/datasets';
import { useState } from 'react';

export interface RenameExperimentDialogProps {
  experiment: DatasetExperiment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits an experiment's name and description. Mount it on demand (`{open && ...}`)
 * so the form state is seeded from the experiment each time it opens.
 */
export function RenameExperimentDialog({ experiment, open, onOpenChange }: RenameExperimentDialogProps) {
  useLocale();
  const [name, setName] = useState(experiment.name ?? '');
  const [description, setDescription] = useState(experiment.description ?? '');
  const { updateExperiment } = useDatasetMutations();

  const canSave = Boolean(name.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || updateExperiment.isPending || !experiment.datasetId) return;

    try {
      await updateExperiment.mutateAsync({
        datasetId: experiment.datasetId,
        experimentId: experiment.id,
        name: name.trim(),
        description: description.trim(),
      });
      toast.success(studioT('Experiment renamed'));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        studioT('Failed to rename experiment: {value0}', {
          value0: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} pending={updateExperiment.isPending}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{studioT('Rename Experiment')}</DialogTitle>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          <DialogBody>
            <Field>
              <FieldLabel required>{studioT('Name')}</FieldLabel>
              <Input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={studioT('Enter experiment name')}
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel>{studioT('Description')}</FieldLabel>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={studioT('Enter experiment description (optional)')}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogCancel>{studioT('Cancel')}</DialogCancel>
            <DialogAction type="submit" disabled={!canSave}>
              {updateExperiment.isPending ? studioT('Saving...') : studioT('Save')}
            </DialogAction>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
