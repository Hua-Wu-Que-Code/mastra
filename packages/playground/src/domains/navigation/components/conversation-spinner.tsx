import { t } from '@mastra/playground-ui/lib/i18n';
import { useEffect, useRef } from 'react';
import './conversation-spinner.css';

/** DSH StateDot ongoing glyph and timing; share the animation clock between rows. */
export function ConversationSpinner() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const pin = () =>
      ref.current?.getAnimations?.({ subtree: true }).forEach(animation => {
        animation.startTime = 0;
      });
    pin();
    const element = ref.current;
    element?.addEventListener('animationstart', pin);
    return () => element?.removeEventListener('animationstart', pin);
  }, []);
  return (
    <svg
      ref={ref}
      role="status"
      aria-label={t('Generating reply')}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className="conversation-spinner shrink-0 text-muted-foreground"
    >
      <g className="conversation-spinner-motion">
        <circle className="conversation-spinner-track" cx="12" cy="12" r="9.5" />
        <circle className="conversation-spinner-arc" cx="12" cy="12" r="9.5" />
      </g>
    </svg>
  );
}
