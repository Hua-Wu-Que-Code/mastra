import { FileDropBackdrop } from '@mastra/playground-ui/components/FileDropBackdrop';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { ReactNode } from 'react';

import { useComposerAttachments } from './composer-attachments';

/** Lets files dragged anywhere over the page be dropped into the composer's attachments. */
export const ComposerFileDrop = ({ disabled, children }: { disabled?: boolean; children: ReactNode }) => {
  useLocale();
  const { addFiles } = useComposerAttachments();

  return (
    <FileDropBackdrop
      onFilesDrop={files => void addFiles(files)}
      label={studioT('Drop to attach')}
      description={studioT('Release to add your files to the message.')}
      disabled={disabled}
    >
      {children}
    </FileDropBackdrop>
  );
};
