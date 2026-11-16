import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

const PLATFORM_LABELS: Record<string, string> = {
  slack: 'Slack',
};

const formatPlatformLabel = (platform: string | null): string => {
  if (!platform) return 'channel';
  return PLATFORM_LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
};

export const useChannelConnectToast = () => {
  const studioLocale = useLocale();
  const [searchParams] = useSearchParams();
  const handledKeyRef = useRef<string | null>(null);

  const channelConnected = searchParams.get('channel_connected');
  const channelError = searchParams.get('channel_error');
  const platform = searchParams.get('platform');
  const team = searchParams.get('team');

  useEffect(() => {
    if (channelConnected !== 'true' && !channelError) return;

    // One-shot guard against React strict-mode double effect / remount re-fires.
    const key = channelError ? `error:${platform}:${channelError}` : `success:${platform}:${team}`;
    /* v8 ignore next -- @preserve */
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    const platformLabel = formatPlatformLabel(platform);

    if (channelConnected === 'true') {
      const teamSuffix = team ? ` workspace "${team}"` : '';
      toast.success(studioT('Connected to {value0}{value1}', { value0: platformLabel, value1: teamSuffix }));
    } else {
      // v8 ignore next
      toast.error(studioT('Failed to connect {value0}: {value1}', { value0: platformLabel, value1: channelError }));
    }
  }, [channelConnected, channelError, platform, searchParams, team, studioLocale]);
};
