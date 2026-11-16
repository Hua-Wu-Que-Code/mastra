import { Field, FieldLabel } from '@mastra/playground-ui/components/Field';
import { Textarea } from '@mastra/playground-ui/components/Textarea';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

export interface ExperimentDescriptionFieldProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  disabled: boolean;
}

export function ExperimentDescriptionField({
  description,
  onDescriptionChange,
  disabled,
}: ExperimentDescriptionFieldProps) {
  useLocale();
  return (
    <Field>
      <FieldLabel>{studioT('Description')}</FieldLabel>
      <Textarea
        value={description}
        onChange={event => onDescriptionChange(event.target.value)}
        placeholder={studioT('Optional')}
        rows={2}
        disabled={disabled}
      />
    </Field>
  );
}
