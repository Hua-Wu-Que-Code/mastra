import { CodeEditor } from '@mastra/playground-ui/components/CodeEditor';
import { useEffect, useRef } from 'react';
import type { ComponentRef, KeyboardEventHandler } from 'react';

export function MarkdownComposerInput({
  value,
  onChange,
  placeholder,
  disabled,
  threadId,
  onKeyDown,
  onCursorChange,
  focusRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  threadId?: string;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onCursorChange?: (position: number) => void;
  focusRef?: (focus: (() => void) | undefined) => void;
}) {
  const ref = useRef<ComponentRef<typeof CodeEditor>>(null);
  useEffect(() => {
    const view = ref.current?.view;
    if (!view || disabled) return;
    view.focus();
    view.dispatch({ selection: { anchor: view.state.doc.length } });
  }, [threadId, disabled]);
  useEffect(() => {
    focusRef?.(() => ref.current?.view?.focus());
    return () => focusRef?.(undefined);
  }, [focusRef]);
  const reportCursor = () => {
    const position = ref.current?.view?.state.selection.main.head;
    if (position !== undefined) onCursorChange?.(position);
  };
  return (
    <CodeEditor
      ref={ref}
      value={value}
      onChange={next => {
        onChange(next);
        reportCursor();
      }}
      onKeyUp={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) reportCursor();
      }}
      onMouseUp={reportCursor}
      language="markdown"
      font="body"
      variant="inline"
      lineNumbers={false}
      showCopyButton={false}
      editable={!disabled}
      placeholder={placeholder}
      aria-label={placeholder}
      onKeyDownCapture={onKeyDown}
      className="max-h-52 overflow-y-auto px-3 pt-2.5 pb-2 text-body"
    />
  );
}
