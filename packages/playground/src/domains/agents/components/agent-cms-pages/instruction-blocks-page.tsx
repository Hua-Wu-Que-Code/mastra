import { Notice } from '@mastra/playground-ui/components/Notice';
import { ScrollArea } from '@mastra/playground-ui/components/ScrollArea';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { Controller } from 'react-hook-form';

import { useAgentEditFormContext } from '../../context/agent-edit-form-context';
import { getEditorOwnership } from '../../utils/editor-ownership';
import { AgentCMSBlocks } from '../agent-cms-blocks';

export function InstructionBlocksPage() {
  useLocale();
  const { form, readOnly, isCodeAgentOverride, editorConfig } = useAgentEditFormContext();
  const { isInstructionsLocked } = getEditorOwnership(isCodeAgentOverride, editorConfig);
  const isReadOnly = readOnly || isInstructionsLocked;

  const schema = form.watch('variables');

  return (
    <ScrollArea className="h-full">
      {isInstructionsLocked && (
        <Notice variant="info" title={studioT('Instructions are owned by code')}>
          <Notice.Message>
            {studioT(
              'This code-defined agent has disabled instructions editing from Studio. Update the agent definition in code to change its instructions.',
            )}
          </Notice.Message>
        </Notice>
      )}
      <Controller
        name="instructionBlocks"
        control={form.control}
        defaultValue={[]}
        render={({ field }) => (
          <AgentCMSBlocks
            items={field.value ?? []}
            onChange={field.onChange}
            placeholder={studioT('Enter content')}
            schema={schema}
            readOnly={isReadOnly}
          />
        )}
      />
    </ScrollArea>
  );
}
