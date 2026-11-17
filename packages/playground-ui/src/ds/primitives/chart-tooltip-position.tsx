import type { ReactElement } from 'react';

/** Compatibility boundary for chart content; no hover portal is mounted. */
export function ChartTooltipPosition(_props: {
  coordinate?: { x: number; y: number };
  children: ReactElement<Record<string, unknown>>;
  [prop: string]: unknown;
}) {
  return null;
}
