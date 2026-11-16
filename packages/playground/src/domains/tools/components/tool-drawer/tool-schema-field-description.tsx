import { useLocale } from '@mastra/playground-ui/lib/i18n';
import { Trans } from '@mastra/playground-ui/lib/i18n/trans';

import type { SchemaField } from '../../utils/get-schema-fields';

export interface ToolSchemaFieldDescriptionProps {
  field: SchemaField;
}

/** A field's description, with its default on a line of its own. */
export function ToolSchemaFieldDescription({ field }: ToolSchemaFieldDescriptionProps) {
  useLocale();
  return (
    <>
      {field.description}
      {field.defaultValue !== undefined && (
        <span className="block">
          <Trans id="Default {part0}" values={{ part0: field.defaultValue }} />
        </span>
      )}
    </>
  );
}
