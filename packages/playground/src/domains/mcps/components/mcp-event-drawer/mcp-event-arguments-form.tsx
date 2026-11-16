import { Txt } from '@mastra/playground-ui/components/Txt';
import { DynamicForm } from '@mastra/playground-ui/lib/form/dynamic-form';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { isEmptySchema } from '@/domains/tools/utils/get-schema-fields';
import { toZodInputSchema } from '@/domains/tools/utils/to-zod-input-schema';

export interface McpEventArgumentsFormProps {
  inputSchema: unknown;
  onChange: (args: Record<string, unknown>) => void;
}

/** The arguments a stream or poll is opened with, as a form built from the event's input schema. */
export function McpEventArgumentsForm({ inputSchema, onChange }: McpEventArgumentsFormProps) {
  useLocale();
  if (isEmptySchema(inputSchema)) {
    return <Txt tone="muted">{studioT('This event takes no arguments.')}</Txt>;
  }

  return <DynamicForm schema={toZodInputSchema(inputSchema)} onValuesChange={values => onChange(values ?? {})} />;
}
