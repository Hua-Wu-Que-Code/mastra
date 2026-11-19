import type { TextPart } from '@mastra/react';
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatFilePathsContext } from '../../../context/chat-context';

import type { MessageMetadata } from '../../message-metadata';
import { AssistantTextPartRenderer } from '../assistant-text-part-renderer';

describe('AssistantTextPartRenderer', () => {
  it('renders markdown text', () => {
    const part = { type: 'text', text: 'hello **world**' } as TextPart;

    render(<AssistantTextPartRenderer part={part} />);

    expect(screen.getByText('world')).not.toBeNull();
  });

  it('renders the empty string safely when text is missing', () => {
    const part = { type: 'text' } as TextPart;

    const { container } = render(<AssistantTextPartRenderer part={part} />);

    expect(container).not.toBeNull();
  });

  it('routes error-status metadata into an error notice', () => {
    const part = { type: 'text', text: 'boom' } as TextPart;
    const metadata: MessageMetadata = { status: 'error' };

    render(<AssistantTextPartRenderer part={part} metadata={metadata} />);

    expect(screen.getByText('boom')).not.toBeNull();
    expect(screen.getByText('Error')).not.toBeNull();
  });

  it('renders a collapsible completion-check notice from completionResult metadata', () => {
    const part = { type: 'text', text: 'all good' } as TextPart;
    const metadata: MessageMetadata = { completionResult: { passed: true } };

    render(<AssistantTextPartRenderer part={part} metadata={metadata} />);

    expect(screen.getByText('Complete')).not.toBeNull();
    expect(screen.getByText('all good')).not.toBeNull();
  });
});

it('shows known artifact names and preserves fenced code and download destinations', () => {
  const path = 'drafts/报告.md';
  render(
    <ChatFilePathsContext.Provider value={['/' + path]}>
      <AssistantTextPartRenderer
        part={
          {
            type: 'text',
            text:
              'Saved `' +
              path +
              '`. [drafts/报告.md](/storage/download?path=%2Fdrafts%2F报告.md)\n\n```text\n' +
              path +
              '\n```\n\n`src/example.ts`\n\n完整图谱已保存于 /drafts/报告.md，请查收。',
          } as TextPart
        }
      />
    </ChatFilePathsContext.Provider>,
  );
  expect(screen.getAllByText('报告.md')).toHaveLength(2);
  expect(screen.getByRole('link', { name: '报告.md' }).getAttribute('href')).toContain('/storage/download?path=');
  expect(screen.getByText('src/example.ts')).not.toBeNull();
  expect(screen.getByText(path)).not.toBeNull();
  expect(screen.getByText('完整图谱已保存于 报告.md，请查收。')).not.toBeNull();
});
