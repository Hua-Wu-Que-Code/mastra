import { focusRing } from '@/ds/primitives/transitions';
import { cn } from '@/lib/utils';

/** A theme-presence point with an accessible label. */
export function LifelinePoint({
  title,
  positionPercent,
  height,
  color,
  onSelect,
}: {
  title: string;
  positionPercent: number | undefined;
  height: number;
  color: string;
  onSelect: (() => void) | undefined;
}) {
  if (positionPercent === undefined) return null;

  const style = { left: `${positionPercent}%`, height: `${height}px`, backgroundColor: color };

  return (
    <>
      {onSelect ? (
        <button
          aria-label={title}
          className={cn(
            'absolute bottom-px w-1.5 -translate-x-1/2 cursor-pointer rounded-xs hover:brightness-125',
            focusRing,
          )}
          onClick={onSelect}
          style={style}
          type="button"
        />
      ) : (
        <span
          aria-label={title}
          className={cn('absolute bottom-px w-1.5 -translate-x-1/2 rounded-xs', focusRing)}
          role="img"
          style={style}
        />
      )}
    </>
  );
}
