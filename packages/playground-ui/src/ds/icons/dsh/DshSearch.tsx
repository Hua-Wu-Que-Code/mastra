import type { SVGProps } from 'react';

/** DSH regular artwork; see notices/DeepSeek-Harness-LICENSE.txt. */
export function DshSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
      data-dsh-icon="search-outline"
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1"
    >
      <path
        d="M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z"
        stroke="currentColor"
      />
      <path d="M10.2991 10.3933L14.7783 14.8725" stroke="currentColor" />
    </svg>
  );
}
