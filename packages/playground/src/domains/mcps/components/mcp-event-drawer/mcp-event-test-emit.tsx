import type { McpServerEventInfo } from '@mastra/client-js';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { DynamicForm } from '@mastra/playground-ui/lib/form/dynamic-form';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { eventRequestErrorMessage, useEmitMcpServerEvent } from '../../hooks/use-mcp-server-events';
import { toZodInputSchema } from '@/domains/tools/utils/to-zod-input-schema';

export interface McpEventTestEmitProps {
  serverId: string;
  event: McpServerEventInfo;
  /** Called after the server accepted the test event. */
  onEmitted?: () => void;
}

/** "Send test event": a form built from the payload schema; shown only under `mastra dev` for emit-fed types. */
export function McpEventTestEmit({ serverId, event, onEmitted }: McpEventTestEmitProps) {
  useLocale();
  const { mutateAsync, isPending, isSuccess, error } = useEmitMcpServerEvent(serverId, event.name);

  const send = async (data: Record<string, unknown>) => {
    try {
      await mutateAsync(data ?? {});
      onEmitted?.();
    } catch {
      // Shown through `error` below.
    }
  };

  return (
    <section aria-label={studioT('Send test event')} className="grid grid-cols-1 gap-3">
      <Txt as="h3" variant="subheading">
        {studioT('Send test event')}
      </Txt>
      <DynamicForm
        schema={toZodInputSchema(event.payloadSchema)}
        onSubmit={send}
        isSubmitLoading={isPending}
        submitButtonLabel={studioT('Send test event')}
      />
      {isSuccess && !error && <Txt tone="muted">{studioT('Test event sent.')}</Txt>}
      {error && <Notice variant="destructive">{eventRequestErrorMessage(error)}</Notice>}
    </section>
  );
}
