import type * as React from 'react';
import type { TooltipContentProps } from './tooltip';

type InfoTooltipProps = {
  /** The explanation shown in the tooltip, and read to screen readers as the icon's description. */
  children: React.ReactNode;
  side?: TooltipContentProps['side'];
  align?: TooltipContentProps['align'];
  /** Layout of the tooltip body, such as a wider `max-w-*` or `space-y-*` for rich content. */
  contentClassName?: string;
} &
  /** What the icon is about, e.g. "Version information": an icon-only button needs a name. */
  ({ 'aria-label': string; 'aria-labelledby'?: never } | { 'aria-label'?: never; 'aria-labelledby': string });

/** Retained for source compatibility; hint-only icons are no longer displayed. */
function InfoTooltip(_props: InfoTooltipProps) {
  return null;
}

export { InfoTooltip };
export type { InfoTooltipProps };
