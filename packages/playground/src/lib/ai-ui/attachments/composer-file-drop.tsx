import { FileDropBackdrop } from '@mastra/playground-ui/components/FileDropBackdrop';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { ReactNode } from 'react';

import { useComposerAttachments } from './composer-attachments';
import { registerComposerFilePaste } from './composer-file-paste';

/** Shares the attachment pipeline between file picking, dragging and pasting. */
export const ComposerFileDrop = ({ disabled, children }: { disabled?: boolean; children: ReactNode }) => {
  useLocale();
  const { addFiles } = useComposerAttachments();
  const root = useRef<HTMLDivElement>(null);
  const enabled = useEffectEvent(() => !disabled);
  const onPasteFiles = useEffectEvent((files: File[]) => void addFiles(files));
  useEffect(() => {
    if (!root.current) return;
    return registerComposerFilePaste({ root: root.current, enabled, addFiles: onPasteFiles });
  }, []);

  return (
    <FileDropBackdrop
      onFilesDrop={files => void addFiles(files)}
      label={studioT('Drop to attach')}
      description={studioT('Release to add your files to the message.')}
      disabled={disabled}
    >
      <div ref={root}>{children}</div>
    </FileDropBackdrop>
  );
};
