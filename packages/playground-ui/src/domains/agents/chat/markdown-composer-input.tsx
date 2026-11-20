import { CodeEditor } from '@/ds/components/CodeEditor';
import { useEffect, useRef } from 'react';
import type { ComponentRef, KeyboardEventHandler } from 'react';

export function MarkdownComposerInput({
  value,
  onChange,
  placeholder,
  disabled,
  threadId,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  threadId?: string;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
}) {
  const ref = useRef<ComponentRef<typeof CodeEditor>>(null);
  useEffect(() => {
    const view = ref.current?.view;
    if (!view || disabled) return;
    view.focus();
    view.dispatch({ selection: { anchor: view.state.doc.length } });
  }, [threadId, disabled]);
  return (
    <CodeEditor
      ref={ref}
      value={value}
      onChange={onChange}
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
