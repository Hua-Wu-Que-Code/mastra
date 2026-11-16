import { describeSpanOutput } from '@mastra/core/observability';
import type {
  AgentRunResult,
  InterruptedSpanOutput,
  ModelGenerationResult,
  ModelStepResult,
  SpanOutputDescription,
} from '@mastra/core/observability';
import type { SpanRecord } from '../../types';
import { SpanPayloadAttachment } from './span-payload-attachment';
import { SpanPayloadJson } from './span-payload-json';
import { SpanPayloadCollapsible, SpanPayloadField, SpanPayloadMarkdown } from './span-payload-primitives';
import { SpanPayloadProcessor } from './span-payload-processor';
import { asCoreSpan, hasItems, pickRenderer } from './span-payload-registry';
import type { PayloadRegistry } from './span-payload-registry';
import { SpanToolNameValue } from './span-payload-tool';
import { ReasoningActivity } from '@/ds/components/ai/activity';
import { DataKeysAndValues } from '@/ds/components/DataKeysAndValues';
import { InlineCode } from '@/ds/components/InlineCode/inline-code';
import { Notice } from '@/ds/components/Notice';
import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

function SpanTextRenderer({ value }: { value: string }) {
  return <SpanPayloadMarkdown>{value}</SpanPayloadMarkdown>;
}

function SpanInterruptedRenderer({ value }: { value: InterruptedSpanOutput }) {
  useLocale();
  const title = { suspended: 'Suspended', aborted: 'Aborted', interrupted: 'Interrupted' }[value.status];
  const hasTarget = value.toolName !== undefined || value.toolCallId !== undefined;
  return (
    <div data-slot="span-interrupted" data-status={value.status} className="flex flex-col gap-3">
      <Notice variant="warning" title={title}>
        {value.reason && <Notice.Message>{value.reason}</Notice.Message>}
      </Notice>
      {hasTarget && (
        <DataKeysAndValues>
          {value.toolName !== undefined && (
            <>
              <DataKeysAndValues.Key>{studioT('Tool')}</DataKeysAndValues.Key>
              <SpanToolNameValue toolName={value.toolName} />
            </>
          )}
          {value.toolCallId !== undefined && (
            <>
              <DataKeysAndValues.Key>{studioT('Tool call id')}</DataKeysAndValues.Key>
              <DataKeysAndValues.ValueWithCopyBtn copyValue={value.toolCallId}>
                {value.toolCallId}
              </DataKeysAndValues.ValueWithCopyBtn>
            </>
          )}
        </DataKeysAndValues>
      )}
    </div>
  );
}

function SpanAgentRunResultRenderer({ value }: { value: AgentRunResult }) {
  useLocale();
  return (
    <div data-slot="span-agent-run-result" className="flex flex-col gap-3">
      {value.tripwire && (
        <Notice variant="destructive" title={studioT('Tripwire')}>
          {value.tripwire.reason && <Notice.Message>{value.tripwire.reason}</Notice.Message>}
          {value.tripwire.processorId && (
            <Txt as="p" variant="caption">
              <Trans id="Processor {part0}" values={{ part0: <InlineCode>{value.tripwire.processorId}</InlineCode> }} />
            </Txt>
          )}
        </Notice>
      )}
      {typeof value.text === 'string' && value.text.length > 0 && (
        <SpanPayloadMarkdown>{value.text}</SpanPayloadMarkdown>
      )}
      {value.object !== undefined && (
        <SpanPayloadField label={studioT('Object')}>
          <SpanPayloadJson value={value.object} />
        </SpanPayloadField>
      )}
      {hasItems(value.files) && (
        <SpanPayloadCollapsible label={studioT('Files ({value0})', { value0: value.files.length })}>
          {value.files.map((file, index) => (
            <SpanPayloadAttachment key={index} value={file} />
          ))}
        </SpanPayloadCollapsible>
      )}
    </div>
  );
}

function SpanModelGenerationResultRenderer({ value }: { value: ModelGenerationResult }) {
  useLocale();
  return (
    <div data-slot="span-model-generation-result" className="flex flex-col gap-3">
      {typeof value.text === 'string' && value.text.length > 0 && (
        <SpanPayloadMarkdown>{value.text}</SpanPayloadMarkdown>
      )}
      {typeof value.reasoningText === 'string' && <ReasoningActivity text={value.reasoningText} />}
      {value.reasoning !== undefined && (
        <SpanPayloadCollapsible label={studioT('Reasoning details')}>
          <SpanPayloadJson value={value.reasoning} />
        </SpanPayloadCollapsible>
      )}
      {value.object !== undefined && (
        <SpanPayloadField label={studioT('Object')}>
          <SpanPayloadJson value={value.object} />
        </SpanPayloadField>
      )}
      {hasItems(value.sources) && (
        <SpanPayloadCollapsible label={studioT('Sources ({value0})', { value0: value.sources.length })}>
          <SpanPayloadJson value={value.sources} />
        </SpanPayloadCollapsible>
      )}
      {hasItems(value.files) && (
        <SpanPayloadCollapsible label={studioT('Files ({value0})', { value0: value.files.length })}>
          {value.files.map((file, index) => (
            <SpanPayloadAttachment key={index} value={file} />
          ))}
        </SpanPayloadCollapsible>
      )}
      {hasItems(value.warnings) && (
        <SpanPayloadCollapsible label={studioT('Warnings ({value0})', { value0: value.warnings.length })}>
          <SpanPayloadJson value={value.warnings} />
        </SpanPayloadCollapsible>
      )}
    </div>
  );
}

function SpanModelStepResultRenderer({ value }: { value: ModelStepResult }) {
  useLocale();
  return (
    <div data-slot="span-model-step-result" className="flex flex-col gap-3">
      {typeof value.text === 'string' && value.text.length > 0 && (
        <SpanPayloadMarkdown>{value.text}</SpanPayloadMarkdown>
      )}
      {value.object !== undefined && (
        <SpanPayloadField label={studioT('Object')}>
          <SpanPayloadJson value={value.object} />
        </SpanPayloadField>
      )}
      {hasItems(value.steps) && (
        <SpanPayloadCollapsible label={studioT('Steps ({value0})', { value0: value.steps.length })}>
          <SpanPayloadJson value={value.steps} />
        </SpanPayloadCollapsible>
      )}
    </div>
  );
}

/** One renderer per `describeSpanOutput` tag; see `SPAN_INPUT_RENDERERS`. */
const SPAN_OUTPUT_RENDERERS = {
  interrupted: SpanInterruptedRenderer,
  'agent-run-result': SpanAgentRunResultRenderer,
  'model-generation-result': SpanModelGenerationResultRenderer,
  'model-step-result': SpanModelStepResultRenderer,
  processor: SpanPayloadProcessor,
  text: SpanTextRenderer,
  json: SpanPayloadJson,
} satisfies PayloadRegistry<SpanOutputDescription>;

export interface SpanOutputRendererProps {
  span: SpanRecord;
}

/** Renders a span's output through the registry; `null` when the span recorded none. */
export function SpanOutputRenderer({ span }: SpanOutputRendererProps) {
  const description = describeSpanOutput(asCoreSpan(span));
  if (!description) return null;
  if (description.type === 'json') return <SpanPayloadJson value={description.value} />;
  const Renderer = pickRenderer(SPAN_OUTPUT_RENDERERS, description);
  return <Renderer value={description.value} />;
}
