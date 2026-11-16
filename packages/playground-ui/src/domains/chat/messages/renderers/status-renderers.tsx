import type {
  ErrorRendererProps,
  MessageStatusRenderers,
  TripwireRendererProps,
  WarningRendererProps,
} from '@mastra/react/ui';
import { TripwireNotice } from '../tripwire-notice';
import { Notice } from '@/ds/components/Notice';
import { t as studioT, useLocale } from '@/lib/i18n';

export const ErrorStatusRenderer = ({ text }: ErrorRendererProps) => {
  useLocale();
  return (
    <Notice variant="destructive" title={studioT('Error')}>
      <Notice.Message>{text}</Notice.Message>
    </Notice>
  );
};

export const WarningStatusRenderer = ({ text }: WarningRendererProps) => {
  useLocale();
  return (
    <Notice variant="warning" title={studioT('Warning')}>
      <Notice.Message>{text}</Notice.Message>
    </Notice>
  );
};

export const TripwireStatusRenderer = ({ text, tripwire }: TripwireRendererProps) => (
  <TripwireNotice reason={text} tripwire={tripwire} />
);

// eslint-disable-next-line react-refresh/only-export-components -- renderer map intentionally co-located with its renderers
export const messageStatusRenderers: MessageStatusRenderers = {
  Error: ErrorStatusRenderer,
  Warning: WarningStatusRenderer,
  Tripwire: TripwireStatusRenderer,
};
