import { Button } from '@mastra/playground-ui/components/Button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@mastra/playground-ui/components/Dialog';
import { Field, FieldLabel } from '@mastra/playground-ui/components/Field';
import { Form } from '@mastra/playground-ui/components/Form';
import { Input } from '@mastra/playground-ui/components/Input';
import { t } from '@mastra/playground-ui/lib/i18n';
import { useState } from 'react';

export function ProjectNameDialog({
  initialName = '',
  onSave,
  onClose,
}: {
  initialName?: string;
  onSave: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog open onOpenChange={open => !open && !pending && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{initialName ? t('Rename project') : t('New project')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form
            onSubmit={async event => {
              event.preventDefault();
              if (!name.trim() || pending) return;
              setPending(true);
              setError(undefined);
              try {
                await onSave(name.trim());
                onClose();
              } catch (error) {
                setError(error instanceof Error ? error.message : t('Failed to save project changes'));
              } finally {
                setPending(false);
              }
            }}
          >
            <Field>
              <FieldLabel>{t('Project name')}</FieldLabel>
              <Input value={name} onChange={event => setName(event.target.value)} autoFocus maxLength={100} />
            </Field>
            {error && <div role="alert">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button type="button" disabled={pending} onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
                {initialName ? t('Save') : t('Create')}
              </Button>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
