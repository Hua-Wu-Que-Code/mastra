import type { SVGProps } from 'react';

/** DSH regular artwork; see notices/DeepSeek-Harness-LICENSE.txt. */
export function DshChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
      data-dsh-icon="chevron-down-outline"
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1"
    >
      <path d="M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6" stroke="currentColor" />
    </svg>
  );
}
