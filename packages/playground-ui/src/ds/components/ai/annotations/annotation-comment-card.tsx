import type { Ref } from 'react';
import { AnnotationNumber } from './annotation-number';
import type { ChatAnnotation } from './chat-annotations';
import { Button } from '@/ds/components/Button';

import { Textarea } from '@/ds/components/Textarea';
import { Txt } from '@/ds/components/Txt';
import { TrashIcon } from '@/ds/icons/TrashIcon';
import { t as studioT, useLocale } from '@/lib/i18n';
import { Trans } from '@/lib/i18n/trans';

export interface AnnotationCommentCardProps {
  annotation: ChatAnnotation;
  number: number;
  commentRef?: Ref<HTMLTextAreaElement>;
  onCommentChange: (comment: string) => void;
  onRemove: () => void;
  onDone: () => void;
}

export function AnnotationCommentCard({
  annotation,
  number,
  commentRef,
  onCommentChange,
  onRemove,
  onDone,
}: AnnotationCommentCardProps) {
  useLocale();
  return (
    <div data-slot="annotation-comment-card" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <AnnotationNumber>{number}</AnnotationNumber>
        <Txt as="span" variant="label" className="flex-1">
          <Trans id="Annotation {part0}" values={{ part0: number }} />
        </Txt>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-my-1 -me-1"
          tooltip={studioT('Remove annotation {value0}', { value0: number })}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>
      <blockquote className="line-clamp-3 border-l-2 border-info-indicator ps-2.5 text-body-sm whitespace-pre-line text-muted-foreground">
        {annotation.text}
      </blockquote>
      <Textarea
        ref={commentRef}
        aria-label={studioT('Comment on annotation {value0}', { value0: number })}
        placeholder={studioT('Add a comment')}
        rows={3}
        className="min-h-18 resize-none"
        value={annotation.comment ?? ''}
        onChange={event => onCommentChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onDone();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <Txt as="span" variant="caption" tone="muted">
          {studioT('Sent with your next message')}
        </Txt>
        <Button type="button" size="sm" onClick={onDone}>
          {studioT('Done')}
        </Button>
      </div>
    </div>
  );
}
