import type { CSSProperties } from 'react';

/** Rebind the existing type tokens only inside chat content, including markdown and tool output. */
export function chatContentStyle(fontSize: number): CSSProperties & Record<`--${string}`, string> {
  const secondary = fontSize <= 14 ? fontSize - 1 : fontSize - 2;
  return {
    fontSize: `${fontSize}px`,
    '--text-body': `${fontSize}px`,
    '--text-body-sm': `${fontSize}px`,
    '--text-caption': `${fontSize * 0.93}px`,
    '--text-meta': `${fontSize * 0.86}px`,
    '--text-title': `${fontSize * 1.7}px`,
    '--text-heading': `${fontSize * 1.4}px`,
    '--text-subheading': `${fontSize * 1.2}px`,
    '--text-column': `${fontSize}px`,
    // DSH process-row axis: rows, slots and glyphs shift by the body delta; titles read one step
    // under the body at 14px and below, two above (13px at the default size).
    '--dsh-content-font-delta': `${fontSize - 14}px`,
    '--dsh-content-font-size-secondary': `${secondary}px`,
    '--dsh-content-font-delta-secondary': `${secondary - 13}px`,
  };
}
