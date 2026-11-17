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
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{initialName ? t('Rename project') : t('New project')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form
            onSubmit={event => {
              event.preventDefault();
              if (name.trim()) {
                onSave(name.trim());
                onClose();
              }
            }}
          >
            <Field>
              <FieldLabel>{t('Project name')}</FieldLabel>
              <Input value={name} onChange={event => setName(event.target.value)} autoFocus maxLength={100} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                {initialName ? t('Save') : t('Create')}
              </Button>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
