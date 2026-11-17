'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { TooltipPopupProps, TooltipPositionerProps } from '@base-ui/react/tooltip';
import * as React from 'react';

type TooltipProviderProps = Omit<TooltipPrimitive.Provider.Props, 'delay' | 'timeout'> & {
  delay?: number;
  timeout?: number;
  /** Radix API compatibility alias for `delay`. */
  delayDuration?: number;
  /** Radix API compatibility alias for `timeout`. */
  skipDelayDuration?: number;
};

function TooltipProvider({ delay, delayDuration, timeout, skipDelayDuration, ...props }: TooltipProviderProps) {
  const resolvedDelay = delay ?? delayDuration;
  const resolvedTimeout = timeout ?? skipDelayDuration;
  return (
    <TooltipPrimitive.Provider
      {...(resolvedDelay !== undefined ? { delay: resolvedDelay } : {})}
      {...(resolvedTimeout !== undefined ? { timeout: resolvedTimeout } : {})}
      {...props}
    />
  );
}

/** Hover hints are disabled throughout Studio. Keep triggers and their actions intact. */
function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} disabled open={false} onOpenChange={undefined} />;
}

type TooltipTriggerProps = TooltipPrimitive.Trigger.Props & {
  /** @deprecated Use Base UI's native `render` prop instead for stronger composition typing. */
  asChild?: boolean;
};

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ asChild, render, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return <TooltipPrimitive.Trigger ref={ref} render={children} {...props} />;
    }
    return (
      <TooltipPrimitive.Trigger ref={ref} render={render} {...props}>
        {children}
      </TooltipPrimitive.Trigger>
    );
  },
);
TooltipTrigger.displayName = 'TooltipTrigger';

type TooltipContentPositionerProps = Omit<TooltipPositionerProps, keyof TooltipPopupProps>;

type TooltipContentProps = TooltipPopupProps &
  TooltipContentPositionerProps & {
    /** Keep the popup in the DOM (hidden) while closed, e.g. so a trigger can point `aria-describedby` at it. */
    keepMounted?: boolean;
  };

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(({ keepMounted, id, children }, ref) =>
  keepMounted && id ? (
    <div ref={ref} id={id} className="sr-only">
      {children}
    </div>
  ) : null,
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
export type { TooltipContentProps };
