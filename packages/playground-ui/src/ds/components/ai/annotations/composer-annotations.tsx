import { useChatAnnotations } from './chat-annotations';
import { ComposerAnnotationList } from './composer-annotation-list';

/**
 * The waiting annotations at the top of `ComposerBox`, wired to
 * `ChatAnnotationsProvider`. Renders nothing while none is waiting.
 */
export function ComposerAnnotations({ showExcerpt = false }: { showExcerpt?: boolean } = {}) {
  const { annotations, removeAnnotation } = useChatAnnotations();
  if (annotations.length === 0) return null;
  return <ComposerAnnotationList annotations={annotations} onRemove={removeAnnotation} showExcerpt={showExcerpt} />;
}
