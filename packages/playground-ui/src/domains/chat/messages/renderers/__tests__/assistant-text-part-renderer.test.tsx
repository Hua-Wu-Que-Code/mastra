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

  it('renders emphasis against Chinese punctuation in both streaming and saved replies', () => {
    const highlighted = '黑色羽绒服（黑色棉服外套）';
    const sentence = `一件**${highlighted}**搭在左侧办公椅的椅背上。`;
    const part: TextPart = { type: 'text', text: sentence };
    const { container, rerender } = render(<AssistantTextPartRenderer part={{ ...part, state: 'streaming' }} />);

    expect(container.querySelector('strong')?.textContent).toBe(highlighted);
    rerender(<AssistantTextPartRenderer part={part} />);
    expect(container.querySelector('strong')?.textContent).toBe(highlighted);
    expect(container.textContent).toBe(`一件${highlighted}搭在左侧办公椅的椅背上。`);
  });

  it('keeps literal Chinese Markdown syntax in code, escapes and unmatched delimiters', () => {
    const literal = '一件**（外套）**搭着';
    const part: TextPart = {
      type: 'text',
      text: `\`${literal}\`\n\n一件\\*\\*（外套）\\*\\*搭着\n\n未闭合的**（括号）`,
    };

    const { container } = render(<AssistantTextPartRenderer part={part} />);

    expect(container.querySelector('code')?.textContent).toBe(literal);
    expect(container.querySelector('strong')).toBeNull();
    expect(Array.from(container.querySelectorAll('p'), node => node.textContent)).toEqual([
      literal,
      literal,
      '未闭合的**（括号）',
    ]);
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
