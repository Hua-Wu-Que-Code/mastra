import { Notice } from '@mastra/playground-ui/components/Notice';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import type { useLiveKitRecording } from '../hooks/use-livekit-recording';
import { LiveKitRecordingPlayer } from './livekit-recording-player';

type RecordingStateProps = Pick<
  ReturnType<typeof useLiveKitRecording>,
  'data' | 'isFetching' | 'isError' | 'dataUpdatedAt'
>;

export function LiveKitRecordingState({ data, isFetching, isError, dataUpdatedAt }: RecordingStateProps) {
  useLocale();
  if (isFetching) return <Txt role="status">{studioT('Loading recording…')}</Txt>;
  if (isError) {
    return (
      <Notice variant="destructive">
        <Notice.Message>{studioT('Unable to load the call recording.')}</Notice.Message>
      </Notice>
    );
  }
  if (data?.status === 'ready') return <LiveKitRecordingPlayer key={dataUpdatedAt} url={data.url} />;
  return (
    <Notice variant="info">
      <Notice.Message>
        {studioT(
          'No recording is available yet. It may still be processing, or recording was not enabled for this call.',
        )}
      </Notice.Message>
    </Notice>
  );
}
