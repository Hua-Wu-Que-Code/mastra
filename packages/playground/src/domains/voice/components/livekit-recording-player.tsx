import { Notice } from '@mastra/playground-ui/components/Notice';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useState } from 'react';

export function LiveKitRecordingPlayer({ url }: { url: string }) {
  useLocale();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <Notice variant="warning">
        <Notice.Message>
          {studioT('The audio could not be played. Refresh the recording to get a new playback link.')}
        </Notice.Message>
      </Notice>
    );
  }
  return (
    <audio
      aria-label={studioT('Call recording')}
      controls
      preload="metadata"
      src={url}
      className="w-full"
      onError={() => setFailed(true)}
    >
      {studioT('Your browser does not support audio playback.')}
    </audio>
  );
}
