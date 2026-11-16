import { useContext } from 'react';
import { WorkflowRunContext } from '../context/workflow-run-context';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/ds/components/Field';
import { Switch } from '@/ds/components/Switch';
import { t as studioT, useLocale } from '@/lib/i18n';

export function WorkflowDebugModeSwitch() {
  useLocale();
  const { debugMode, setDebugMode } = useContext(WorkflowRunContext);

  return (
    <Field orientation="horizontal" className="min-w-0">
      <Switch checked={debugMode} onCheckedChange={setDebugMode} />
      <FieldContent className="gap-0.5">
        <FieldLabel size="smaller">{studioT('Step by step')}</FieldLabel>
        <FieldDescription className="text-meta text-muted-foreground">
          {studioT('Pause to inspect outputs')}
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
