import { useState } from 'react';
import { Button } from '../../../ds/components/Button';
import { CodeEditor } from '../../../ds/components/CodeEditor';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '../../../ds/components/Dialog';
import { Txt } from '../../../ds/components/Txt';
import { IconShareAndroid } from '@/ds/icons/central/IconShareAndroid';
import { t as studioT, useLocale } from '@/lib/i18n';

interface NetworkChoiceMetadataProps {
  selectionReason: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input?: string | Record<string, unknown>;
}

const NetworkChoiceMetadata = ({ selectionReason, open, onOpenChange, input }: NetworkChoiceMetadataProps) => {
  useLocale();
  let inputSlot = null;

  if (input) {
    try {
      inputSlot = typeof input === 'object' ? <CodeEditor data={input} /> : <CodeEditor data={JSON.parse(input)} />;
    } catch {
      inputSlot = <pre className="whitespace-pre-wrap">{input as string}</pre>;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{studioT('Agent Network Metadata')}</DialogTitle>
          <DialogDescription>{studioT("View the metadata of the agent's network choice.")}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-2">
            <Txt tone="muted">{studioT('Selection Reason')}</Txt>
            <Txt as="p" variant="body" tone="ink">
              {selectionReason}
            </Txt>
          </div>

          {inputSlot && (
            <div className="space-y-2">
              <Txt tone="muted">{studioT('Input')}</Txt>
              {inputSlot}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export interface NetworkChoiceMetadataDialogTriggerProps {
  selectionReason: string;
  input?: string | Record<string, unknown>;
}

export const NetworkChoiceMetadataDialogTrigger = ({
  selectionReason,
  input,
}: NetworkChoiceMetadataDialogTriggerProps) => {
  useLocale();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="default"
        size="icon-md"
        tooltip={studioT('Show selection reason')}
        onClick={() => setIsOpen(s => !s)}
      >
        <IconShareAndroid className="size-5 text-muted-foreground" />
      </Button>

      <NetworkChoiceMetadata
        selectionReason={selectionReason || ''}
        open={isOpen}
        onOpenChange={setIsOpen}
        input={input}
      />
    </>
  );
};
