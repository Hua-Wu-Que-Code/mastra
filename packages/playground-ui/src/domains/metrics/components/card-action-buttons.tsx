import { MetricsCard, onCardHover } from '../../../ds/components/MetricsCard';
import { TraceIcon } from '../../../ds/icons/TraceIcon';
import { IconChatBubbles } from '@/ds/icons/central/IconChatBubbles';
import { IconCodeTree } from '@/ds/icons/central/IconCodeTree';
import { LogsIcon } from '@/ds/icons/LogsIcon';
import { t as studioT, useLocale } from '@/lib/i18n';

type CardActionButtonProps = {
  onClick: () => void;
};

/** Icon button in a MetricsCard top bar that opens the Traces page pre-filtered
 *  to whatever dimensions the card knows about. Waits for the card's hover. */
export function OpenInTracesButton({ onClick }: CardActionButtonProps) {
  useLocale();
  return (
    <MetricsCard.Action label={studioT('View in traces')} className={onCardHover} onClick={onClick}>
      <TraceIcon />
    </MetricsCard.Action>
  );
}

/** Icon button in a MetricsCard top bar that opens the Logs page scoped to
 *  errors for the card's current dimensions. Waits for the card's hover. */
export function OpenErrorsInLogsButton({ onClick }: CardActionButtonProps) {
  useLocale();
  return (
    <MetricsCard.Action label={studioT('View errors in logs')} className={onCardHover} onClick={onClick}>
      <LogsIcon />
    </MetricsCard.Action>
  );
}

/** Icon button in a MetricsCard top bar that opens the Logs page scoped to
 *  the card's current dimensions, whatever their status. Waits for the card's hover. */
export function OpenInLogsButton({ onClick }: CardActionButtonProps) {
  useLocale();
  return (
    <MetricsCard.Action label={studioT('View in logs')} className={onCardHover} onClick={onClick}>
      <LogsIcon />
    </MetricsCard.Action>
  );
}

/** Icon button in a MetricsCard top bar that opens the Spans page scoped to
 *  the card's current dimensions. Waits for the card's hover. */
export function OpenInSpansButton({ onClick }: CardActionButtonProps) {
  useLocale();
  return (
    <MetricsCard.Action label={studioT('View in spans')} className={onCardHover} onClick={onClick}>
      <IconCodeTree />
    </MetricsCard.Action>
  );
}

/** Icon button in a MetricsCard top bar that opens the Threads page scoped to
 *  the card's current dimensions. Waits for the card's hover. */
export function OpenInThreadsButton({ onClick }: CardActionButtonProps) {
  useLocale();
  return (
    <MetricsCard.Action label={studioT('View in threads')} className={onCardHover} onClick={onClick}>
      <IconChatBubbles />
    </MetricsCard.Action>
  );
}
