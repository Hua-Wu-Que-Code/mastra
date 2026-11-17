import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComposerAttachments } from '../attachment';
import { ComposerAttachmentsProvider } from '../composer-attachments';
import { ComposerFileDrop } from '../composer-file-drop';

// The OS drag-and-drop is the only browser boundary; the real provider classifies the files.
const dropOnWindow = (files: File[]) => {
  for (const type of ['dragenter', 'drop']) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files } });
    act(() => {
      fireEvent(window, event);
    });
  }
};

const renderComposer = (disabled = false) =>
  render(
    <ComposerAttachmentsProvider>
      <ComposerFileDrop disabled={disabled}>
        <ComposerAttachments />
        <textarea aria-label="Message" />
      </ComposerFileDrop>
    </ComposerAttachmentsProvider>,
  );

const paste = (target: EventTarget, files: File[], text = '', useItems = true) => {
  const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: useItems ? files.map(file => ({ kind: 'file', getAsFile: () => file })) : [],
      files,
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  });
  fireEvent(target, event);
  return event;
};

describe('ComposerFileDrop', () => {
  describe('when files are pasted', () => {
    it.each([
      ['image.png', 'image/png', true],
      ['report.pdf', 'application/pdf', true],
      ['notes.txt', 'text/plain', false],
    ])('attaches %s through the existing file pipeline', async (name, type, useItems) => {
      renderComposer();
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'text', { value: async () => 'content' });
      const event = paste(screen.getByRole('textbox'), [file], '', useItems);
      expect(event.defaultPrevented).toBe(true);
      expect(await screen.findByRole('button', { name: `Remove ${name}` })).toBeTruthy();
    });

    it('keeps normal text paste and mixed text paste available to the textarea', async () => {
      renderComposer();
      expect(paste(screen.getByRole('textbox'), [], 'hello').defaultPrevented).toBe(false);
      const event = paste(
        screen.getByRole('textbox'),
        [new File(['image'], 'image.png', { type: 'image/png' })],
        'caption',
      );
      expect(event.defaultPrevented).toBe(false);
      expect(await screen.findByRole('button', { name: 'Remove image.png' })).toBeTruthy();
    });

    it('routes page paste to the last focused composer, with a main composer fallback', async () => {
      renderComposer();
      paste(document.body, [new File(['image'], 'main.png', { type: 'image/png' })]);
      expect(await screen.findByRole('button', { name: 'Remove main.png' })).toBeTruthy();
      render(
        <ComposerAttachmentsProvider>
          <ComposerFileDrop>
            <textarea aria-label="Secondary message" />
            <ComposerAttachments />
          </ComposerFileDrop>
        </ComposerAttachmentsProvider>,
      );
      fireEvent.focusIn(screen.getByRole('textbox', { name: 'Secondary message' }));
      paste(document.body, [new File(['pdf'], 'secondary.pdf', { type: 'application/pdf' })]);
      expect(await screen.findByRole('button', { name: 'Remove secondary.pdf' })).toBeTruthy();
      // The paste is handled only once, even with two registered composers.
      expect(screen.getAllByRole('button', { name: 'Remove secondary.pdf' })).toHaveLength(1);
    });

    it('does not steal file paste from another input or a modal', async () => {
      renderComposer();
      const outside = document.createElement('input');
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.append(outside);
      const file = new File(['image'], 'blocked.png', { type: 'image/png' });
      try {
        expect(paste(outside, [file]).defaultPrevented).toBe(false);
        document.body.append(modal);
        expect(paste(document.body, [file]).defaultPrevented).toBe(false);
        expect(paste(screen.getByRole('textbox', { name: 'Message' }), [file]).defaultPrevented).toBe(false);
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove blocked.png' })).toBeNull());
      } finally {
        outside.remove();
        modal.remove();
      }
    });

    it('ignores files when disabled or inside a hidden composer', async () => {
      const view = renderComposer(true);
      const file = new File(['image'], 'blocked.png', { type: 'image/png' });
      expect(paste(screen.getByRole('textbox'), [file]).defaultPrevented).toBe(false);
      view.unmount();
      const hidden = render(
        <div hidden>
          <ComposerAttachmentsProvider>
            <ComposerFileDrop>
              <textarea aria-label="Hidden message" />
            </ComposerFileDrop>
          </ComposerAttachmentsProvider>
        </div>,
      );
      expect(paste(document.body, [file]).defaultPrevented).toBe(false);
      hidden.unmount();
    });
  });

  describe('when a file is dragged over the page', () => {
    it('covers the page with a drop backdrop', () => {
      renderComposer();
      const event = new Event('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [] } });
      act(() => {
        fireEvent(window, event);
      });
      expect(screen.getByRole('status').textContent).toContain('Drop to attach');
    });
  });

  describe('when a text file is dropped', () => {
    it('attaches it to the composer', async () => {
      renderComposer();
      const notes = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      Object.defineProperty(notes, 'text', { value: async () => 'hello' });
      dropOnWindow([notes]);
      expect(await screen.findByRole('button', { name: 'Preview notes.txt' })).toBeTruthy();
    });
  });

  describe('when a spreadsheet is dropped', () => {
    it('attaches it to the composer', async () => {
      renderComposer();
      dropOnWindow([new File(['binary'], 'leads.xlsx')]);
      expect(await screen.findByRole('button', { name: 'Remove leads.xlsx' })).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('when the composer is disabled', () => {
    it('ignores dragged files', () => {
      renderComposer(true);
      dropOnWindow([new File(['hello'], 'notes.txt', { type: 'text/plain' })]);
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Preview notes.txt' })).toBeNull();
    });
  });
});
