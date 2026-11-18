// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TooltipProvider } from '../Tooltip';
import { MarkdownRenderer } from './markdown-renderer';

afterEach(cleanup);

const mapping = String.raw`F=(F_1,\dots,F_n):\mathbb{C}^n\to\mathbb{C}^n`;

describe('MarkdownRenderer math', () => {
  it('typesets the inline mapping from the reply and retains its TeX for accessibility', () => {
    const { container } = render(<MarkdownRenderer>{`设 $${mapping}$ 是多项式映射。`}</MarkdownRenderer>);
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
    expect(container.querySelector('annotation[encoding="application/x-tex"]')?.textContent).toBe(mapping);
    expect(container.querySelector('.katex-error')).toBeNull();
    expect(container.textContent).toContain('是多项式映射。');
  });

  it('does not decode TeX commands beginning with n as escaped newlines', () => {
    const tex = String.raw`\nu\neq 0,\quad \nabla f\not=0`;
    const { container } = render(<MarkdownRenderer>{`$${tex}$`}</MarkdownRenderer>);
    expect(container.querySelector('annotation')?.textContent).toBe(tex);
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it('keeps display math intact across blank lines between paragraphs', () => {
    const { container } = render(<MarkdownRenderer>{'Before.\n\n$$\nF(x)=x\n\n+1\n$$\n\nAfter.'}</MarkdownRenderer>);
    expect(container.querySelectorAll('.katex-display')).toHaveLength(1);
    expect(container.querySelector('annotation')?.textContent).toBe('F(x)=x\n\n+1');
    expect(container.textContent).toContain('Before.');
    expect(container.textContent).toContain('After.');
  });

  it('renders math fences but leaves formulas inside ordinary code literal', () => {
    const { container } = render(
      <TooltipProvider>
        <MarkdownRenderer>{'```math\nx^2\n```\n\n`$x$`\n\n```text\n$x$\n```'}</MarkdownRenderer>
      </TooltipProvider>,
    );
    expect(container.querySelectorAll('.katex-display')).toHaveLength(1);
    expect(container.querySelector('p > code')?.textContent).toBe('$x$');
    expect(container.textContent).toContain('$x$');
  });

  it('keeps incomplete streamed TeX literal and typesets it when the reply finishes', () => {
    const { container, rerender } = render(<MarkdownRenderer streaming>{'Answer: $\\frac{1}{'}</MarkdownRenderer>);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.querySelector('.katex-error')).toBeNull();
    rerender(<MarkdownRenderer>{'Answer: $\\frac{1}{2}$'}</MarkdownRenderer>);
    expect(container.querySelector('math')).not.toBeNull();
    expect(container.querySelector('annotation')?.textContent).toBe(String.raw`\frac{1}{2}`);
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it('keeps invalid math readable without losing the rest of the reply', () => {
    const { container } = render(<MarkdownRenderer>{'Before $\\unknownCommand{x}$ after.'}</MarkdownRenderer>);
    expect(container.textContent).toContain('Before');
    expect(container.textContent).toContain('after.');
    expect(container.textContent).toContain('\\unknownCommand');
  });

  it('does not allow TeX commands or raw HTML to inject active content', () => {
    const { container } = render(
      <MarkdownRenderer>{String.raw`$\href{javascript:alert(1)}{click}$ <script>alert(1)</script>`}</MarkdownRenderer>,
    );
    expect(container.querySelector('script, a[href^="javascript:"]')).toBeNull();
  });
});
