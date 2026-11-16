import { useGetBackgroundTaskById, useBackgroundTaskStream } from '@mastra/react/hooks/agents';
import { useState } from 'react';
import { Button } from '@/ds/components/Button';
import { CodeEditor } from '@/ds/components/CodeEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/ds/components/Dialog';
import { Txt } from '@/ds/components/Txt';
import { IconLoadingCircle } from '@/ds/icons/central/IconLoadingCircle';
import { IconShareAndroid } from '@/ds/icons/central/IconShareAndroid';
import { useTimeDiff } from '@/hooks/use-time-diff';

import { t as studioT, useLocale } from '@/lib/i18n';

import { Trans } from '@/lib/i18n/trans';
import { toSigFigs } from '@/utils/number';

interface BackgroundTaskMetadataProps {
  backgroundTaskTaskId: string;
  backgroundTaskStartedAt: Date;
  backgroundTaskCompletedAt?: Date;
  backgroundTaskSuspendedAt?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BackgroundTaskMetadata = ({
  backgroundTaskTaskId,
  backgroundTaskStartedAt,
  backgroundTaskCompletedAt,
  backgroundTaskSuspendedAt,
  open,
  onOpenChange,
}: BackgroundTaskMetadataProps) => {
  useLocale();
  const { data: task } = useGetBackgroundTaskById({
    backgroundTaskId: backgroundTaskTaskId,
    queryOptions: { enabled: !!backgroundTaskCompletedAt || !!backgroundTaskSuspendedAt },
  });
  const { tasks } = useBackgroundTaskStream({
    taskId: backgroundTaskTaskId,
    enabled: !backgroundTaskCompletedAt && !backgroundTaskSuspendedAt,
  });

  const timeDiff = useTimeDiff({
    startedAt: new Date(backgroundTaskStartedAt).getTime(),
    endedAt: backgroundTaskCompletedAt
      ? new Date(backgroundTaskCompletedAt).getTime()
      : backgroundTaskSuspendedAt
        ? new Date(backgroundTaskSuspendedAt).getTime()
        : undefined,
  });

  const backgroundTask = task || tasks[backgroundTaskTaskId];

  const args = backgroundTask?.args;
  const result = backgroundTask?.result as any;
  const suspendPayload = backgroundTask?.suspendPayload;

  let argSlot = null;

  try {
    const {
      __mastraMetadata: _,
      _background,
      ...formattedArgs
    } = typeof args === 'object' ? args : JSON.parse(args ?? '');
    argSlot = <CodeEditor data={formattedArgs} />;
  } catch {
    // oxlint-disable-next-line typescript/no-unnecessary-type-assertion -- The built task type is an object; TypeScript requires unknown as the intermediate type in this string assertion.
    argSlot = <pre className="overflow-x-auto rounded-md bg-muted p-4 whitespace-pre">{args as unknown as string}</pre>;
  }

  const resultSlot =
    typeof result === 'string' ? (
      <pre className="overflow-x-auto rounded-md bg-muted p-4 whitespace-pre">{result}</pre>
    ) : (
      <CodeEditor data={result} />
    );

  const suspendPayloadSlot =
    typeof suspendPayload === 'string' ? (
      <pre className="overflow-x-auto rounded-md bg-muted p-4 whitespace-pre">{suspendPayload}</pre>
    ) : (
      <CodeEditor data={suspendPayload as Record<string, unknown> | Record<string, unknown>[] | undefined} />
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{studioT('Background Task Metadata')}</DialogTitle>
          <DialogDescription>{studioT('View the metadata of the background task.')}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-2">
            <Txt tone="muted">{studioT('Background Task Duration')}</Txt>
            <Txt variant="body" tone="ink">
              <Trans id="{part0} ms" values={{ part0: toSigFigs(timeDiff, 3) }} />
            </Txt>
          </div>

          <div className="space-y-2">
            <Txt tone="muted">{studioT('Background Task Arguments')}</Txt>
            {argSlot}
          </div>

          {suspendPayloadSlot !== undefined && suspendPayload && (
            <div className="space-y-2">
              <Txt tone="muted">{studioT('Background Task Suspend Data')}</Txt>
              {suspendPayloadSlot}
            </div>
          )}

          {resultSlot !== undefined && result && (
            <div className="space-y-2">
              <Txt tone="muted">{studioT('Background Task Result')}</Txt>
              {resultSlot}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export interface BackgroundTaskMetadataDialogTriggerProps {
  backgroundTask: {
    taskId: string;
    startedAt: Date;
    completedAt?: Date;
    suspendedAt?: Date;
  };
}

export const BackgroundTaskMetadataDialogTrigger = ({ backgroundTask }: BackgroundTaskMetadataDialogTriggerProps) => {
  useLocale();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="default"
        size="icon-md"
        tooltip={studioT('Show background task information')}
        onClick={() => setIsOpen(s => !s)}
      >
        {backgroundTask.completedAt || backgroundTask.suspendedAt ? (
          <IconShareAndroid className="text-muted-foreground" />
        ) : (
          <IconLoadingCircle className="animate-spin text-muted-foreground" />
        )}
      </Button>

      <BackgroundTaskMetadata
        backgroundTaskTaskId={backgroundTask.taskId}
        backgroundTaskStartedAt={backgroundTask.startedAt}
        backgroundTaskCompletedAt={backgroundTask.completedAt}
        backgroundTaskSuspendedAt={backgroundTask.suspendedAt}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
};
