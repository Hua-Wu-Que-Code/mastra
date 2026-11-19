// @vitest-environment jsdom
import '@/test/inert-resize-observer';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { chatContentStyle } from '../chat-content-style';
import { ProcessRow } from '../process-row';

afterEach(cleanup);

/** DSH DisclosureRow geometry: 16 slot, 14 glyph, 6 gap, 22 body indent, 24 row, all riding the font delta. */
describe('chatContentStyle process axis', () => {
  it('publishes the body delta and the secondary tier like DSH', () => {
    expect(chatContentStyle(14)).toMatchObject({
      '--dsh-content-font-delta': '0px',
      '--dsh-content-font-size-secondary': '13px',
      '--dsh-content-font-delta-secondary': '0px',
    });
    expect(chatContentStyle(12)).toMatchObject({
      '--dsh-content-font-delta': '-2px',
      '--dsh-content-font-size-secondary': '11px',
      '--dsh-content-font-delta-secondary': '-2px',
    });
    // Above 14 the secondary tier sits two steps under the body.
    expect(chatContentStyle(18)).toMatchObject({
      '--dsh-content-font-delta': '4px',
      '--dsh-content-font-size-secondary': '16px',
      '--dsh-content-font-delta-secondary': '3px',
    });
  });
});

describe('ProcessRow geometry', () => {
  function renderRow(props: Partial<Parameters<typeof ProcessRow>[0]> = {}) {
    return render(
      <ProcessRow icon={<svg data-testid="glyph" />} label="Read" detail="a.md" {...props}>
        <p>body</p>
      </ProcessRow>,
    );
  }

  it('sizes the row, slot and glyph from the font delta', () => {
    renderRow();
    const trigger = screen.getByRole('button', { name: 'Read' });
    expect(trigger.className).toContain('min-h-[calc(24px+var(--dsh-content-font-delta,0px))]');
    // The row is exactly one 24px line: no vertical padding stacked on the line box.
    expect(trigger.className).toContain('leading-[calc(24px+var(--dsh-content-font-delta,0px))]');
    expect(trigger.className).not.toContain('py-1');
    const slot = screen.getByTestId('glyph').closest('[data-process-slot]');
    expect(slot?.className).toContain('size-[calc(16px+var(--dsh-content-font-delta,0px))]');
    expect(slot?.className).toContain('[&_svg]:size-[calc(14px+var(--dsh-content-font-delta,0px))]');
    expect(slot?.className).not.toContain('[&_svg]:size-4');
  });

  it('keeps the 6px gap and reads the secondary type tier', () => {
    renderRow();
    const trigger = screen.getByRole('button', { name: 'Read' });
    expect(trigger.className).toContain('gap-1.5');
    expect(trigger.className).toContain('text-[length:var(--dsh-content-font-size-secondary,13px)]');
  });

  it('crossfades glyph and chevron over 100ms instead of toggling visibility', () => {
    renderRow();
    const glyphLayer = screen.getByTestId('glyph').parentElement;
    expect(glyphLayer?.className).toContain('transition-opacity');
    expect(glyphLayer?.className).toContain('duration-100');
    expect(glyphLayer?.className).toContain('motion-reduce:transition-none');
    expect(glyphLayer?.className).not.toContain('invisible');
    const chevronLayer = document.querySelector('[data-process-chevron]');
    expect(chevronLayer?.className).toContain('opacity-0');
    expect(chevronLayer?.className).toContain('transition-opacity');
    expect(chevronLayer?.className).not.toContain('invisible');
  });

  it('rests on the tertiary tone and lifts to the secondary one on hover', () => {
    renderRow();
    const root = document.querySelector('[data-process-row]');
    expect(root?.className).toContain('text-muted-foreground');
    const trigger = screen.getByRole('button', { name: 'Read' });
    expect(trigger.className).toContain('hover:text-foreground');
    expect(trigger.className).toContain('transition-colors');
    expect(trigger.className).toContain('duration-100');
  });

  it('draws the 2px separator one step lighter than the text', () => {
    renderRow();
    const dot = document.querySelector('[data-process-separator]');
    expect(dot?.className).toContain('size-0.5');
    expect(dot?.className).toContain('mx-0.5');
    expect(dot?.className).toContain('bg-placeholder');
    expect(dot?.className).not.toContain('bg-current');
  });

  it('indents a plain body to the title start', () => {
    renderRow({ defaultOpen: true });
    expect(screen.getByText('body').parentElement?.className).toContain(
      'pl-[calc(22px+var(--dsh-content-font-delta,0px))]',
    );
  });

  it('caps a group body at min(400px,50vh) and fades both scroll edges', () => {
    renderRow({ defaultOpen: true, group: true });
    const body = screen.getByText('body').closest('[data-process-body]');
    expect(body?.className).toContain('max-h-[min(400px,50vh)]');
    expect(body?.className).not.toContain('max-h-96');
    expect(body?.className).toContain('overflow-y-auto');
    expect(body?.getAttribute('data-process-body')).toBe('group');
  });

  it('adds 8px under an open group header', () => {
    renderRow({ defaultOpen: true, group: true });
    const trigger = screen.getByRole('button', { name: 'Read' });
    expect(trigger.className).toContain('data-[panel-open]:pb-2');
  });
});
