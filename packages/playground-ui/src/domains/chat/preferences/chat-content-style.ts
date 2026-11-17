import type { CSSProperties } from 'react';

/** Rebind the existing type tokens only inside chat content, including markdown and tool output. */
export function chatContentStyle(fontSize: number): CSSProperties & Record<`--${string}`, string> {
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
  };
}
