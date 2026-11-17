import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';
import type { PreviewCardPopupProps, PreviewCardPositionerProps } from '@base-ui/react/preview-card';
import * as React from 'react';

/** Preview links remain navigable, without hover popups or preview-loading callbacks. */
function HoverCard(props: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root {...props} open={false} onOpenChange={undefined} />;
}

export type HoverCardTriggerProps = Omit<PreviewCardPrimitive.Trigger.Props, 'className'> & {
  className?: string;
};

const HoverCardTrigger = React.forwardRef<HTMLAnchorElement, HoverCardTriggerProps>(
  ({ className, delay = 250, ...props }, ref) => (
    <PreviewCardPrimitive.Trigger ref={ref} delay={delay} className={className} {...props} />
  ),
);
HoverCardTrigger.displayName = 'HoverCardTrigger';

type HoverCardContentPositionerProps = Omit<PreviewCardPositionerProps, keyof PreviewCardPopupProps>;

export type HoverCardContentProps = Omit<PreviewCardPopupProps, 'className'> &
  HoverCardContentPositionerProps & {
    className?: string;
    container?: HTMLElement | null;
    showArrow?: boolean;
  };

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>((_props, _ref) => null);
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent };
