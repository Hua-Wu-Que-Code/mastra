// @vitest-environment jsdom
import '@/test/inert-resize-observer';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ToolCallProvider } from '../../context/tool-call-context';
import { MessageRow } from '../../messages/message-row';
import { chatPreferencesSchema } from '../chat-preferences';
import { ChatPreferencesProvider } from '../chat-preferences-provider';
import { ChatPreferencesSettings } from '../chat-preferences-settings';
import { EditorPreferencesSettings } from '../editor-preferences-settings';
import { WorkDetails, WorkDetailsToggle } from '../work-details-context';
import {
  approvalConversation,
  conversation,
  conversationWithBookkeeping,
  failedConversation,
  failedConversationWithNotifications,
  failedRunConversation,
} from './fixtures/conversation';
import { server } from '@/test/msw-server';

function tree({ running = false, latest = true, scope = 'alice', messages = conversation, summaryOnly = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MastraReactProvider baseUrl="http://localhost:4111">
      <QueryClientProvider client={client}>
        <ToolCallProvider
          approveToolcall={() => {}}
          declineToolcall={() => {}}
          approveToolcallGenerate={() => {}}
          declineToolcallGenerate={() => {}}
          approveNetworkToolcall={() => {}}
          declineNetworkToolcall={() => {}}
          isRunning={running}
          toolCallApprovals={{}}
          networkToolCallApprovals={{}}
        >
          <ChatPreferencesProvider key={scope} scope={scope}>
            <ChatPreferencesSettings />
            <EditorPreferencesSettings />
            <div data-testid="conversation">
              <WorkDetails messages={messages} running={running} latest={latest} summaryOnly={summaryOnly}>
                <WorkDetailsToggle />
                {messages.map(message => (
                  <MessageRow key={message.id} message={message} />
                ))}
              </WorkDetails>
            </div>
          </ChatPreferencesProvider>
        </ToolCallProvider>
      </QueryClientProvider>
    </MastraReactProvider>
  );
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  const item = await screen.findByRole('option', { name: option, exact: true });
  fireEvent.pointerDown(item, { pointerType: 'mouse' });
  fireEvent.click(item, { detail: 1 });
  await waitFor(() => expect(screen.getByRole('combobox', { name: label }).textContent).toContain(option));
}

beforeAll(() => {
  if (window.PointerEvent === undefined)
    Object.defineProperty(window, 'PointerEvent', { value: window.MouseEvent, configurable: true });
});
beforeEach(() => {
  localStorage.clear();
  server.use(
    http.get('http://localhost:4111/api/mcp/v0/servers', () => HttpResponse.json({ servers: [], totalCount: 0 })),
  );
});
afterEach(cleanup);

describe('Chat presentation', () => {
  describe('when the conversation shows activity summaries only', () => {
    it('shows only the file name after opening details for a saved answer', async () => {
      render(tree({ summaryOnly: true }));
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      fireEvent.click(within(screen.getByRole('group', { name: 'Work details: 1 steps' })).getByRole('button'));

      expect(await screen.findByText('story.txt')).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Read' })).toBeNull();
      expect(screen.queryByText(/Compare the two characters|private-attachment|offset|A story draft/)).toBeNull();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
    });

    it('keeps reasoning and tool payloads out of fully expanded live activity', async () => {
      render(tree({ summaryOnly: true, running: true }));
      await choose('Work details', 'Fully expanded');

      expect(await screen.findByText('story.txt')).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Read' })).toBeNull();
      expect(screen.queryByText(/Compare the two characters|private-attachment|offset|A story draft/)).toBeNull();
    });
  });

  describe('whole-turn control geometry (DSH TurnProcessNodeView)', () => {
    it('is 33px tall at the body size with an 8px pad and a hairline rule', () => {
      render(tree());
      const control = screen.getByRole('button', { name: 'Show work details' });
      expect(control.className).toContain('h-[calc(33px+var(--dsh-content-font-delta,0px))]');
      expect(control.className).toContain('pb-2');
      expect(control.className).toContain('border-b-[0.5px]');
      expect(control.className).toContain('text-body');
      expect(control.className).not.toContain('pb-3');
      expect(control.style.getPropertyValue('--dsh-content-font-delta')).toBe('0px');
    });
    it('puts one 14px chevron 4px after the label and rotates it instead of swapping', () => {
      render(tree());
      const control = screen.getByRole('button', { name: 'Show work details' });
      const chevron = control.querySelector('[data-process-turn-chevron]')?.getAttribute('class');
      expect(chevron).toContain('ml-1');
      expect(chevron).toContain('[&_svg]:size-3.5');
      expect(chevron).toContain('transition-transform');
      expect(chevron).toContain('duration-100');
      expect(chevron).not.toContain('rotate-180');
      fireEvent.click(control);
      expect(
        screen
          .getByRole('button', { name: 'Hide work details' })
          .querySelector('[data-process-turn-chevron]')
          ?.getAttribute('class'),
      ).toContain('rotate-180');
    });
  });

  describe('when a completed turn is folded', () => {
    it('migrates the old persisted default while retaining deliberate new preferences', () => {
      expect(chatPreferencesSchema.parse({ foldedReplies: 'all', fontSize: 18 })).toMatchObject({
        foldedReplies: 'final',
        fontSize: 18,
        processFoldingVersion: 2,
      });
      expect(chatPreferencesSchema.parse({ foldedReplies: 'all', processFoldingVersion: 2 }).foldedReplies).toBe('all');
    });
    it('keeps only the final reply by default and reveals the whole process on demand', async () => {
      render(tree());
      expect(screen.queryByText('I will check the material first.')).toBeNull();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      expect(await screen.findByText('I will check the material first.')).toBeDefined();
      fireEvent.click(within(screen.getByRole('group', { name: 'Work details: 2 steps' })).getByRole('button'));
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Hide work details' }).getAttribute('aria-expanded')).toBe('true');
    });
    it('preserves the explicit option to keep all replies when collapsed', async () => {
      const view = render(tree());
      await choose('Replies when collapsed', 'All replies');
      expect(await screen.findByText('I will check the material first.')).toBeDefined();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      view.unmount();
      render(tree());
      expect(await screen.findByText('I will check the material first.')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      expect(screen.getByText('I will check the material first.')).toBeDefined();
    });
    it('retains every text segment of the final answer', () => {
      const messages = conversation.map(message =>
        message.role === 'assistant'
          ? {
              ...message,
              content: {
                ...message.content,
                parts: [...message.content.parts, { type: 'text' as const, text: 'And its ending.' }],
              },
            }
          : message,
      );
      render(tree({ messages }));
      expect(screen.queryByText('I will check the material first.')).toBeNull();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      expect(screen.getByText('And its ending.')).toBeDefined();
    });
  });
  describe('when folding waits for the next message', () => {
    it('keeps the latest work open until a newer user turn exists', async () => {
      const view = render(tree());
      await choose('Collapse work details', 'On next message');
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      view.rerender(tree({ latest: false }));
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
    });
  });
  describe('when a running turn completes', () => {
    it.each(['updateWorkingMemory', 'task_write', 'task_complete'])(
      'collapses visible work after a successful hidden %s call',
      toolName => {
        const messages = conversationWithBookkeeping(toolName);
        const view = render(tree({ messages, running: true }));
        expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
        view.rerender(tree({ messages, running: false }));
        expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Show work details' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByText('The final story begins here.')).toBeDefined();
        fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Work details: 2 steps' })).getByRole('button'));
        expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      },
    );

    it('collapses work and preserves the final reply', () => {
      const view = render(tree({ running: true }));
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      view.rerender(tree({ running: false }));
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
    });

    it('keeps focused work available until focus leaves it', () => {
      const view = render(tree({ running: true }));
      const reasoning = screen.getByRole('group', { name: 'Reasoning' });
      const focusedButton = within(reasoning).getByRole('button');
      act(() => focusedButton.focus());
      view.rerender(tree({ running: false }));
      expect(screen.getByRole('button', { name: 'Hide work details' })).toBeDefined();
      expect(document.activeElement).toBe(focusedButton);
      act(() => screen.getByRole('spinbutton', { name: 'Font size' }).focus());
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
    });
  });
  describe('when fully expanded mode is selected', () => {
    it('keeps process rows visible regardless of collapse timing', async () => {
      render(tree());
      await choose('Work details', 'Fully expanded');
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Show work details' })).toBeNull();
      expect(screen.queryByRole('combobox', { name: 'Replies when collapsed' })).toBeNull();
    });
  });
  describe('when a run fails before its final reply', () => {
    it('lets the user reopen and fold the work while keeping the error visible', () => {
      render(tree({ messages: failedRunConversation, summaryOnly: true }));
      const control = screen.getByRole('button', { name: 'Show work details' });
      expect(control.textContent).toContain('Failed');
      expect(screen.getByText('The model request failed.')).toBeDefined();
      expect(screen.queryByText('I will check the material first.')).toBeNull();
      expect(screen.queryByRole('group', { name: 'Work details: 1 steps' })).toBeNull();

      fireEvent.click(control);
      const work = screen.getByRole('group', { name: 'Work details: 1 steps' });
      fireEvent.click(within(work).getByRole('button'));
      expect(screen.getByText('story.txt')).toBeDefined();
      expect(screen.getByText('I will check the material first.')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Hide work details' }));
      expect(screen.queryByText('story.txt')).toBeNull();
      expect(screen.getByText('The model request failed.')).toBeDefined();
    });
  });
  describe('when the only activity is a failed tool call', () => {
    it('lets the reader open the failed tool call from the collapsed turn', () => {
      render(tree({ messages: failedConversation }));
      const control = screen.getByRole('button', { name: 'Show work details' });
      expect(control.textContent).toContain('Failed');
      expect(screen.queryByRole('button', { name: /Read/ })).toBeNull();
      fireEvent.click(control);
      expect(screen.getByRole('button', { name: /Read/ })).toBeDefined();
    });
  });
  describe('when a failed turn includes tool activity and subagent notifications', () => {
    it('folds failed tools and both forms of subagent notifications without hiding the reply or error', () => {
      render(tree({ messages: failedConversationWithNotifications }));
      expect(screen.queryByRole('button', { name: /Read/ })).toBeNull();
      expect(screen.queryByText('Scan A completed.')).toBeNull();
      expect(screen.queryByText('Scan B completed.')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      expect(screen.getByRole('button', { name: /Read/ })).toBeDefined();
      expect(screen.getByText('Scan A completed.')).toBeDefined();
      expect(screen.getByText('Scan B completed.')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Hide work details' }));
      expect(screen.queryByRole('button', { name: /Read/ })).toBeNull();
      expect(screen.queryByText('Scan A completed.')).toBeNull();
      expect(screen.queryByText('Scan B completed.')).toBeNull();
      expect(screen.getByText('External event received.')).toBeDefined();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      expect(screen.getByText('The model request failed.')).toBeDefined();
    });
  });
  describe('when a tool waits for approval', () => {
    it.each([false, true])(
      'keeps the approval action accessible with activity summaries set to %s',
      async summaryOnly => {
        render(tree({ messages: approvalConversation, summaryOnly }));
        await choose('Work details', 'Compact');
        expect(screen.getByRole('button', { name: /Approve/ })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Show work details' })).toBeNull();
      },
    );
  });
  describe('when compact mode is selected during a run', () => {
    it('groups reasoning and tool details without hiding replies', async () => {
      render(tree({ running: true }));
      await choose('Work details', 'Compact');
      expect(screen.getByRole('group', { name: 'Work details: 2 steps' })).toBeDefined();
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
      expect(screen.getByText('I will check the material first.')).toBeDefined();
    });
  });
  describe('when standard mode is selected during a run', () => {
    it('keeps the group compact and reveals its reasoning preview on demand', async () => {
      render(tree({ running: true }));
      await choose('Work details', 'Standard');
      const group = screen.getByRole('group', { name: 'Work details: 2 steps' });
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
      fireEvent.click(within(group).getByRole('button'));
      const reasoning = screen.getByRole('group', { name: 'Reasoning' });
      expect(reasoning.textContent).toContain('Compare the two characters.');
      expect(reasoning.textContent).not.toContain('Keep their motives consistent.');
    });
  });
  describe('when font size is changed', () => {
    it('applies the size to message content', () => {
      const { container } = render(tree());
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Font size' }), { target: { value: '20' } });
      const content = container.querySelector<HTMLElement>('[data-slot="message-content"]');
      expect(content && getComputedStyle(content).fontSize).toBe('20px');
    });
    it('allows partial edits and clamps out-of-range values on blur', () => {
      render(tree());
      const input = screen.getByRole('spinbutton', { name: 'Font size' });
      fireEvent.change(input, { target: { value: '1' } });
      expect(input).toHaveProperty('value', '1');
      fireEvent.change(input, { target: { value: '18' } });
      expect(input).toHaveProperty('value', '18');
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.blur(input);
      expect(input).toHaveProperty('value', '22');
    });
  });
  describe('when busy sending is configured', () => {
    it('defaults to queue and persists the alternative per account', async () => {
      const view = render(tree());
      expect(screen.getByRole('button', { name: 'Queue', exact: true }).getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(screen.getByRole('button', { name: 'Steer', exact: true }));
      view.rerender(tree({ scope: 'bob' }));
      expect(screen.getByRole('button', { name: 'Queue', exact: true }).getAttribute('aria-pressed')).toBe('true');
      view.rerender(tree());
      expect(screen.getByRole('button', { name: 'Steer', exact: true }).getAttribute('aria-pressed')).toBe('true');
      view.unmount();
      render(tree());
      expect(screen.getByRole('button', { name: 'Steer', exact: true }).getAttribute('aria-pressed')).toBe('true');
    });
  });
  describe('when accounts change', () => {
    it('isolates saved presentation choices', async () => {
      const view = render(tree());
      await choose('Work details', 'Compact');
      view.rerender(tree({ scope: 'bob' }));
      expect(screen.getByRole('combobox', { name: 'Work details' }).textContent).toContain('Detailed');
      view.rerender(tree());
      expect(screen.getByRole('combobox', { name: 'Work details' }).textContent).toContain('Compact');
    });
  });
});
