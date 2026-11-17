import type { SVGProps } from 'react';

/** DSH regular artwork; see notices/DeepSeek-Harness-LICENSE.txt. */
export function DshCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
      data-dsh-icon="code-outline"
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1"
    >
      <path d="M6.27612 1.5L4.52612 14.5" stroke="currentColor" />
      <path d="M11.4739 1.5L9.72388 14.5" stroke="currentColor" />
      <path d="M2.39868 5.5H14.0681" stroke="currentColor" />
      <path d="M1.93188 10.5H13.6013" stroke="currentColor" />
    </svg>
  );
}
