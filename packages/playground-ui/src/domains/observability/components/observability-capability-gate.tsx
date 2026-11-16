import type { ReactNode } from 'react';
import { EmptyState } from '@/ds/components/EmptyState';
import { Spinner } from '@/ds/components/Spinner';
import { Txt } from '@/ds/components/Txt';
import { t as studioT, useLocale } from '@/lib/i18n';

export type ObservabilityCapabilityGateProps = {
  isLoading: boolean;
  enabled: boolean;
  /** The page's screen-reader heading while its body is not shown (the body brings its own). */
  heading: string;
  /** Shown when the store does not support the capability. */
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
};

/** Renders its children once the store declares the capability they need. */
export function ObservabilityCapabilityGate({
  isLoading,
  enabled,
  heading,
  title,
  description,
  children,
}: ObservabilityCapabilityGateProps) {
  useLocale();
  if (enabled) return children;

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      {isLoading ? (
        <div className="flex h-full items-center justify-center gap-2">
          <Spinner aria-label={studioT('Loading storage capabilities')} />
          <Txt as="span" variant="caption" tone="muted">
            {studioT('Loading storage capabilities')}
          </Txt>
        </div>
      ) : (
        <EmptyState variant="fill" titleSlot={title} descriptionSlot={description} />
      )}
    </>
  );
}
