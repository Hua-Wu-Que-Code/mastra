type PasteTarget = {
  root: HTMLElement;
  enabled: () => boolean;
  addFiles: (files: File[]) => void;
};

const editableSelector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const modalSelector = '[role="dialog"][aria-modal="true"], [role="menu"]';

// Like DSH, route page-level paste to the last focused, visible composer. One
// listener per document prevents the same clipboard files reaching two chats.
const routers = new WeakMap<Document, ReturnType<typeof createRouter>>();

function createRouter(document: Document) {
  const targets = new Set<PasteTarget>();
  let focused: PasteTarget | undefined;

  const accepts = (target: PasteTarget) => {
    if (!target.enabled() || !target.root.isConnected || target.root.closest('[hidden], [inert]')) return false;
    for (let node: HTMLElement | null = target.root; node; node = node.parentElement) {
      const style = document.defaultView?.getComputedStyle(node);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    const foreground = Array.from(document.querySelectorAll(modalSelector)).at(-1);
    return !foreground || foreground.contains(target.root);
  };

  const originOf = (event: Event) => event.composedPath().find(node => node instanceof Element);
  const onFocus = (event: FocusEvent) => {
    const origin = originOf(event);
    if (!origin) return;
    const target = Array.from(targets).find(target => target.root.contains(origin));
    if (target && accepts(target)) focused = target;
  };
  const onPaste = (event: ClipboardEvent) => {
    if (event.defaultPrevented || !event.clipboardData) return;
    const origin = originOf(event);
    const editable = origin?.closest(editableSelector);
    const owner = origin && Array.from(targets).find(target => target.root.contains(origin));
    // Other editors and foreground dialogs retain ownership of their clipboard.
    if (editable && !owner) return;
    const target = owner ?? (focused && accepts(focused) ? focused : Array.from(targets).find(accepts));
    if (!target || !accepts(target)) return;

    const files = Array.from(event.clipboardData.items ?? [])
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(file => file !== null);
    if (!files.length) files.push(...Array.from(event.clipboardData.files));
    if (!files.length) return;

    // A textarea can paste a caption normally while files enter the attachment
    // pipeline. File-only paste must not insert a file name or HTML fragment.
    if (!editable || !event.clipboardData.getData('text/plain')) event.preventDefault();
    focused = target;
    target.addFiles(files);
  };

  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('paste', onPaste, true);
  return {
    register(target: PasteTarget) {
      targets.add(target);
      return () => {
        targets.delete(target);
        if (focused === target) focused = undefined;
        if (targets.size === 0) {
          document.removeEventListener('focusin', onFocus, true);
          document.removeEventListener('paste', onPaste, true);
          routers.delete(document);
        }
      };
    },
  };
}

export function registerComposerFilePaste(target: PasteTarget) {
  const document = target.root.ownerDocument;
  let router = routers.get(document);
  if (!router) {
    router = createRouter(document);
    routers.set(document, router);
  }
  return router.register(target);
}
