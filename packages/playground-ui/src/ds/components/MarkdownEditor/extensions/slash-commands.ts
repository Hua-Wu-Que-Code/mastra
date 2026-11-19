import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { markdownLanguage } from '@codemirror/lang-markdown';
import type { EditorView } from '@codemirror/view';
import { insideCodeBlock } from './markdown-commands';
import { t as studioT } from '@/lib/i18n';

type Block = { label: string; markdown: string; insert: string; caret?: number };

const blocks: readonly Block[] = [
  {
    get label() {
      return studioT('Heading 1');
    },
    markdown: '#',
    insert: '# ',
  },
  {
    get label() {
      return studioT('Heading 2');
    },
    markdown: '##',
    insert: '## ',
  },
  {
    get label() {
      return studioT('Heading 3');
    },
    markdown: '###',
    insert: '### ',
  },
  {
    get label() {
      return studioT('Bulleted list');
    },
    markdown: '-',
    insert: '- ',
  },
  {
    get label() {
      return studioT('Numbered list');
    },
    markdown: '1.',
    insert: '1. ',
  },
  {
    get label() {
      return studioT('Quote');
    },
    markdown: '>',
    insert: '> ',
  },
  {
    get label() {
      return studioT('Code block');
    },
    markdown: '```',
    insert: '```\n\n```',
    caret: 4,
  },
  {
    get label() {
      return studioT('Divider');
    },
    markdown: '***',
    insert: '***\n',
  },
];

const getOptions = (): Completion[] =>
  blocks.map((block, index) => ({
    label: block.label,
    detail: block.markdown,
    type: 'keyword',
    boost: -index,
    apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
      const slash = from - 1;
      view.dispatch({
        changes: { from: slash, to, insert: block.insert },
        selection: { anchor: slash + (block.caret ?? block.insert.length) },
        scrollIntoView: true,
        userEvent: 'input.complete',
      });
    },
  }));

function slashCompletions(context: CompletionContext): CompletionResult | null {
  if (context.state.readOnly) return null;
  const typed = context.matchBefore(/\/\w*$/);
  if (!typed) return null;
  const line = context.state.doc.lineAt(typed.from);
  if (context.state.sliceDoc(line.from, typed.from).trim() !== '' || insideCodeBlock(context.state, typed.from)) {
    return null;
  }
  return { from: typed.from + 1, options: getOptions(), validFor: /^\w*$/ };
}

export const slashCommands = markdownLanguage.data.of({ autocomplete: slashCompletions });
