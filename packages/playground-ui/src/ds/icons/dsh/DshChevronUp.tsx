import type { SVGProps } from 'react';

/** DSH regular artwork; see notices/DeepSeek-Harness-LICENSE.txt. */
export function DshChevronUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
      data-dsh-icon="chevron-up-outline"
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1"
    >
      <path d="M12 10L8.70711 6.70711C8.31658 6.31658 7.68342 6.31658 7.29289 6.70711L4 10" stroke="currentColor" />
    </svg>
  );
}
