import type { AddDatasetItemParams } from '@mastra/client-js';
import { useDataset, useDatasetMutations, useDatasets } from '@mastra/react/hooks/datasets';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { CreateDatasetDialogRenderProps } from '../save-as-dataset-item-dialog';
import { buildAddItemPayload } from './build-add-item-payload';
import type { AddItemDraft, AddItemError, AddItemField } from './build-add-item-payload';
import { CollapsibleSettingsRow } from './collapsible-settings-row';
import { DatasetFieldErrors } from './dataset-field-errors';
import { DatasetPicker } from './dataset-picker';
import { parseFieldErrors } from './field-errors';
import type { FieldErrors } from './field-errors';
import { TrajectoryEditor } from './trajectory-editor';
import { toTrajectoryStepRow } from './trajectory-types';
import type { TrajectoryExpectation } from './trajectory-types';
import { useTargetAgentTools } from './use-target-agent-tools';
import { Badge } from '@/ds/components/Badge';
import { Button } from '@/ds/components/Button';
import { CodeEditor } from '@/ds/components/CodeEditor';
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ds/components/Dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/ds/components/Field';
import { Txt } from '@/ds/components/Txt';
import { SettingsContainer } from '@/ds/new/settings';
import { useLinkComponent } from '@/lib/framework';

import { t as studioT, useLocale } from '@/lib/i18n';

import { Trans } from '@/lib/i18n/trans';
import { cn } from '@/lib/utils';
import { toast } from '@/utils/toast';

export interface AddDatasetItemDialogProps {
  /** The dataset to add the item to. Without it, the dialog asks which dataset. */
  datasetId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** JSON or plain text prefilled in the input editor. */
  initialInput?: string;
  /** JSON or plain text prefilled in the ground truth editor. */
  initialGroundTruth?: string;
  /** Raw JSON array prefilled in the tool mocks editor. */
  initialToolMocks?: string;
  /** Steps prefilled in the trajectory editor; switches the expected trajectory on. */
  initialTrajectory?: TrajectoryExpectation;
  /** Where the item comes from; sent as is. */
  source?: AddDatasetItemParams['source'];
  /** Renders a create-dataset dialog, offered first in the dataset picker. The created dataset gets picked. */
  renderCreateDatasetDialog?: (props: CreateDatasetDialogRenderProps) => ReactNode;
}

type InitialValues = Pick<
  AddDatasetItemDialogProps,
  'initialInput' | 'initialGroundTruth' | 'initialToolMocks' | 'initialTrajectory'
>;

const initialDraft = ({
  initialInput,
  initialGroundTruth,
  initialToolMocks,
  initialTrajectory,
}: InitialValues): AddItemDraft => {
  const steps = initialTrajectory?.steps ?? [];
  return {
    input: initialInput ?? '{}',
    groundTruth: initialGroundTruth ?? '',
    toolMocks: initialToolMocks ?? '',
    requestContextEnabled: false,
    requestContext: '',
    trajectoryEnabled: steps.length > 0,
    ordering: initialTrajectory?.ordering ?? 'relaxed',
    trajectorySteps: steps.map(toTrajectoryStepRow),
  };
};

const TOOL_MOCKS_PLACEHOLDER = `[
  { "toolName": "getWeather", "args": { "city": "Paris" }, "output": { "temp": 18 } },
  { "toolName": "getForecast", "args": {}, "output": { "days": 5 }, "matchArgs": "ignore" }
]`;

/** The keys of the dataset's request context schema, as a JSON object to fill in. */
const requestContextPlaceholder = (schema: unknown) => {
  const properties = typeof schema === 'object' && schema !== null && 'properties' in schema ? schema.properties : {};
  const keys = typeof properties === 'object' && properties !== null ? Object.keys(properties) : [];
  if (keys.length === 0) return '{ "tenantId": "acme" }';
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, ''])), null, 2);
};

type WizardStep = 1 | 2 | 3;

/** Only steps whose fields don't describe themselves carry a description. */
const STEPS: Record<WizardStep, { title: string; description?: ReactNode; optional?: boolean }> = {
  1: {
    get title() {
      return studioT('Input and ground truth');
    },
  },
  2: {
    get title() {
      return studioT('Tool mocks');
    },
    optional: true,
    get description() {
      return studioT(
        'Return fixed results instead of running the real tools. When the target calls a tool listed here with the same args, it gets your output back. Leave empty to run tools for real.',
      );
    },
  },
  3: {
    get title() {
      return studioT('Context and trajectory');
    },
    optional: true,
    get description() {
      return studioT(
        'Pass values to the run, or check the steps the target takes. Leave both off to add the item without them.',
      );
    },
  },
};

const GROUND_TRUTH_PLACEHOLDER = '{ "text": "The answer you expect" }';

/** Copying an editor that holds nothing worth copying is noise. */
const hasContent = (value: string) => !['', '{}'].includes(value.trim());

/** Only JSON can be formatted; offering it on plain text would only fail. */
const isJson = (value: string) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const STEP_COUNT = Object.keys(STEPS).length;

const STEP_OF_FIELD: Record<AddItemField, WizardStep> = {
  input: 1,
  groundTruth: 1,
  toolMocks: 2,
  requestContext: 3,
  expectedTrajectory: 3,
};

const isAddItemField = (field: string): field is AddItemField => field in STEP_OF_FIELD;

const stepTransition = 'animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none';

/**
 * Add an item to a dataset in three steps: the input and its expected answer, tool mocks, then the request
 * context and expected trajectory. Only the first step is required; the others can be left empty.
 */
export function AddDatasetItemDialog({ open, onOpenChange, ...props }: AddDatasetItemDialogProps) {
  const { addItem } = useDatasetMutations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} pending={addItem.isPending}>
      <DialogContent size="xl">
        {/* The form unmounts on close, so every open starts fresh from the initial values. */}
        <AddDatasetItemForm {...props} addItem={addItem} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function WizardHeader({ step }: { step: WizardStep }) {
  useLocale();
  const { title, description, optional } = STEPS[step];

  return (
    <DialogHeader key={step} className={stepTransition}>
      <div className="flex min-w-0 items-center gap-2">
        <DialogTitle>{title}</DialogTitle>
        {optional && <Badge size="sm">{studioT('Optional')}</Badge>}
      </div>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
  );
}

function StepProgress({ step }: { step: WizardStep }) {
  useLocale();
  return (
    <div className="mr-auto flex items-center gap-2">
      <ol
        className="flex gap-1"
        aria-label={studioT('Step {value0} of {value1}', { value0: step, value1: STEP_COUNT })}
      >
        {Object.keys(STEPS).map((key, index) => (
          <li
            key={key}
            aria-current={index + 1 === step ? 'step' : undefined}
            className={cn('h-1 w-6 rounded-full transition-colors', index < step ? 'bg-success-indicator' : 'bg-fill')}
          />
        ))}
      </ol>
      <Txt as="span" variant="caption" tone="muted" aria-hidden="true">
        <Trans id="Step {part0} of {part1}" values={{ part0: step, part1: STEP_COUNT }} />
      </Txt>
    </div>
  );
}

type AddDatasetItemFormProps = Omit<AddDatasetItemDialogProps, 'open'> & {
  addItem: ReturnType<typeof useDatasetMutations>['addItem'];
};

function AddDatasetItemForm({
  datasetId,
  onOpenChange,
  onSuccess,
  source,
  renderCreateDatasetDialog,
  addItem,
  ...initialValues
}: AddDatasetItemFormProps) {
  useLocale();
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState(() => initialDraft(initialValues));
  const [formError, setFormError] = useState<AddItemError>();
  const [apiErrors, setApiErrors] = useState<FieldErrors>();
  const [pickedDatasetId, setPickedDatasetId] = useState('');
  const [isCreateDatasetOpen, setIsCreateDatasetOpen] = useState(false);

  const targetDatasetId = datasetId ?? pickedDatasetId;
  const { data: targetDataset } = useDataset({
    datasetId: targetDatasetId,
    queryOptions: { enabled: Boolean(targetDatasetId) },
  });
  const { toolNames } = useTargetAgentTools(targetDatasetId, { enabled: true });
  const { data: datasetList, isLoading: isDatasetsLoading } = useDatasets({ queryOptions: { enabled: !datasetId } });
  const { navigate, paths } = useLinkComponent();

  const datasets = datasetList?.datasets ?? [];
  const pickedDataset = datasets.find(dataset => dataset.id === pickedDatasetId);
  // Picking needs the dataset listed: a just-created one is picked before the refetch returns it.
  const hasDataset = datasetId !== undefined || pickedDataset !== undefined;

  const update = (patch: (current: AddItemDraft) => Partial<AddItemDraft>) => {
    setDraft(current => ({ ...current, ...patch(current) }));
    setFormError(undefined);
  };

  const showError = (error: AddItemError) => {
    setFormError(error);
    setStep(STEP_OF_FIELD[error.field]);
  };

  /** Checks what was entered so far, then moves on; the trajectory is checked once reached. */
  const advance = () => {
    const checked = buildAddItemPayload({ ...draft, trajectoryEnabled: false });
    if ('error' in checked) return showError(checked.error);
    setStep(step === 1 ? 2 : 3);
  };

  const handleSubmit = async () => {
    const payload = buildAddItemPayload(draft);
    if ('error' in payload) return showError(payload.error);

    try {
      const item = await addItem.mutateAsync({
        datasetId: targetDatasetId,
        ...payload.params,
        ...(source ? { source } : {}),
      });
      if (pickedDataset) {
        // Opens the dataset with the new item's drawer; apps without that route return ''.
        const itemHref = paths.datasetItemLink(pickedDataset.id, item.id);
        toast.success(studioT('Added to {value0}', { value0: pickedDataset.name }), {
          action: itemHref ? { label: studioT('Go to dataset'), onClick: () => navigate(itemHref) } : undefined,
        });
      } else {
        toast.success(studioT('Item added successfully'));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const fieldErrors = parseFieldErrors(error);
      if (fieldErrors) {
        setApiErrors(fieldErrors);
        if (isAddItemField(fieldErrors.field)) setStep(STEP_OF_FIELD[fieldErrors.field]);
        return;
      }
      toast.error(
        studioT('Failed to add item: {value0}', { value0: error instanceof Error ? error.message : 'Unknown error' }),
      );
    }
  };

  const errorOf = (field: AddItemField) => (formError?.field === field ? formError.message : undefined);
  const apiErrorsOf = (field: AddItemField) => (apiErrors?.field === field ? apiErrors.errors : []);
  const isInvalid = (field: AddItemField) => Boolean(errorOf(field)) || apiErrorsOf(field).length > 0;

  const editField = (field: 'input' | 'groundTruth' | 'toolMocks' | 'requestContext') => (value: string) => {
    update(() => ({ [field]: value }));
    setApiErrors(undefined);
  };

  return (
    <>
      <WizardHeader step={step} />

      <DialogBody>
        {/* Every step stays mounted so what was entered survives going back and forth. */}
        <div hidden={step !== 1} className={cn('flex flex-col gap-6', stepTransition)}>
          {datasetId === undefined && (
            <DatasetPicker
              datasets={datasets}
              value={pickedDatasetId}
              onValueChange={setPickedDatasetId}
              loading={isDatasetsLoading || (Boolean(pickedDatasetId) && !pickedDataset)}
              disabled={addItem.isPending}
              onCreateDataset={renderCreateDatasetDialog ? () => setIsCreateDatasetOpen(true) : undefined}
            />
          )}

          <div className="grid items-start gap-5 sm:grid-cols-2">
            <Field invalid={isInvalid('input')}>
              <FieldLabel required>{studioT('Input')}</FieldLabel>
              <FieldDescription>
                {studioT('What the target receives when this item runs. JSON or plain text.')}
              </FieldDescription>
              <CodeEditor
                value={draft.input}
                onChange={editField('input')}
                aria-label={studioT('Input')}
                showCopyButton={hasContent(draft.input)}
                showFormatButton={hasContent(draft.input) && isJson(draft.input)}
                className="h-[220px]"
              />
              <FieldError>{errorOf('input')}</FieldError>
              <DatasetFieldErrors field="input" errors={apiErrorsOf('input')} />
            </Field>
            <Field invalid={isInvalid('groundTruth')}>
              <FieldLabel>{studioT('Ground truth')}</FieldLabel>
              <FieldDescription>
                {studioT('The expected answer scorers compare against. JSON or plain text.')}
              </FieldDescription>
              <CodeEditor
                value={draft.groundTruth}
                onChange={editField('groundTruth')}
                aria-label={studioT('Ground truth')}
                placeholder={GROUND_TRUTH_PLACEHOLDER}
                showCopyButton={hasContent(draft.groundTruth)}
                showFormatButton={hasContent(draft.groundTruth) && isJson(draft.groundTruth)}
                className="h-[220px]"
              />
              <FieldError>{errorOf('groundTruth')}</FieldError>
              <DatasetFieldErrors field="groundTruth" errors={apiErrorsOf('groundTruth')} />
            </Field>
          </div>
        </div>

        <div hidden={step !== 2} className={stepTransition}>
          <Field invalid={isInvalid('toolMocks')}>
            <CodeEditor
              value={draft.toolMocks}
              onChange={editField('toolMocks')}
              aria-label={studioT('Tool mocks JSON')}
              placeholder={TOOL_MOCKS_PLACEHOLDER}
              showCopyButton={hasContent(draft.toolMocks)}
              showFormatButton={hasContent(draft.toolMocks)}
              className="h-80"
            />
            <FieldError>{errorOf('toolMocks')}</FieldError>
            <DatasetFieldErrors field="toolMocks" errors={apiErrorsOf('toolMocks')} />
          </Field>
        </div>

        <div hidden={step !== 3} className={stepTransition}>
          <SettingsContainer>
            <CollapsibleSettingsRow
              label={studioT('Request context')}
              description={studioT('Values passed to the target when this item runs.')}
              enabled={draft.requestContextEnabled}
              onEnabledChange={requestContextEnabled => update(() => ({ requestContextEnabled }))}
              errorMsg={errorOf('requestContext')}
            >
              <CodeEditor
                value={draft.requestContext}
                onChange={editField('requestContext')}
                aria-label={studioT('Request context JSON')}
                placeholder={requestContextPlaceholder(targetDataset?.requestContextSchema)}
                showCopyButton={hasContent(draft.requestContext)}
                showFormatButton={hasContent(draft.requestContext)}
                className="min-h-[120px]"
              />
            </CollapsibleSettingsRow>
            <CollapsibleSettingsRow
              label={studioT('Expected trajectory')}
              description={studioT('The steps the target should take to produce its answer.')}
              enabled={draft.trajectoryEnabled}
              onEnabledChange={trajectoryEnabled => update(() => ({ trajectoryEnabled }))}
              errorMsg={errorOf('expectedTrajectory')}
            >
              <TrajectoryEditor
                ordering={draft.ordering}
                onOrderingChange={ordering => update(() => ({ ordering }))}
                steps={draft.trajectorySteps}
                onStepsChange={change => update(current => ({ trajectorySteps: change(current.trajectorySteps) }))}
                toolNames={toolNames}
              />
            </CollapsibleSettingsRow>
          </SettingsContainer>
        </div>
      </DialogBody>

      <DialogFooter>
        <StepProgress step={step} />
        {step === 1 ? (
          <DialogCancel>{studioT('Cancel')}</DialogCancel>
        ) : (
          <Button
            variant="ghost"
            disabled={addItem.isPending}
            onClick={() => setStep(current => (current - 1) as WizardStep)}
          >
            {studioT('Back')}
          </Button>
        )}
        {step < 3 ? (
          <DialogAction disabled={!hasDataset} onConfirm={advance}>
            {studioT('Next')}
          </DialogAction>
        ) : (
          <DialogAction onConfirm={() => void handleSubmit()}>{studioT('Add item')}</DialogAction>
        )}
      </DialogFooter>

      {/* Rendered inside the dialog so the nested dialog stays in its focus scope instead of dismissing it. */}
      {renderCreateDatasetDialog?.({
        open: isCreateDatasetOpen,
        onOpenChange: setIsCreateDatasetOpen,
        onSuccess: setPickedDatasetId,
      })}
    </>
  );
}
