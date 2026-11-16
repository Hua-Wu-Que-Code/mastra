import type { SignalCatalogEntry } from '@mastra/client-js';
import { getSignalColor } from './signal-colors';
import { orderedSignals, signalDescription, signalLabel } from './signal-formatting';
import { InfoTooltip } from '@/ds/components/Tooltip';
import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

/** Info tooltip for first-time viewers: signals → themes → snapshots. */
export function TraceIntelligenceExplainer({ signalCatalog }: { signalCatalog: readonly SignalCatalogEntry[] }) {
  useLocale();
  const enabledSignals = orderedSignals(
    signalCatalog,
    signalCatalog.filter(signal => signal.enabled).map(signal => signal.name),
  );
  return (
    <InfoTooltip aria-label={studioT('What is trace intelligence?')} contentClassName="max-w-sm space-y-3 p-4">
      <p className="text-foreground">
        <Trans
          id="Every trace is analyzed for {part0} {part1} , and traces with similar signals are clustered into named themes."
          values={{
            part0: enabledSignals.length === 4 ? studioT('four') : enabledSignals.length,
            part1: enabledSignals.length === 1 ? studioT('signal') : studioT('signals'),
          }}
        />
      </p>
      <ul className="space-y-1.5">
        {enabledSignals.map(signalName => (
          <li key={signalName} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-muted-foreground">
            <Txt
              as="span"
              variant="meta"

              className="uppercase"
              style={{ color: getSignalColor(signalName) }}
            >
              {signalLabel(signalCatalog, signalName)}
            </Txt>
            <span>{signalDescription(signalCatalog, signalName)}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        {studioT('Snapshots capture the themes at points in time, so the views show how they appear, grow, and fade.')}
      </p>
    </InfoTooltip>
  );
}
