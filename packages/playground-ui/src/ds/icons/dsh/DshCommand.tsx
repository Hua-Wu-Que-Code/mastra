import type { SVGProps } from 'react';

/** DSH regular artwork; see notices/DeepSeek-Harness-LICENSE.txt. */
export function DshCommand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
      data-dsh-icon="api-outline"
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1"
    >
      <path d="M3 4L7 8L3 12" stroke="currentColor" />
      <path d="M9 12H13" stroke="currentColor" />
    </svg>
  );
}
