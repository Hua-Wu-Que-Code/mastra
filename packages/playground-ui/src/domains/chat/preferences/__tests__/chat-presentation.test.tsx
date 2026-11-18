// @vitest-environment jsdom
import '@/test/inert-resize-observer';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ToolCallProvider } from '../../context/tool-call-context';
import { MessageRow } from '../../messages/message-row';
import { ChatPreferencesProvider } from '../chat-preferences-provider';
import { ChatPreferencesSettings } from '../chat-preferences-settings';
import { EditorPreferencesSettings } from '../editor-preferences-settings';
import { WorkDetails, WorkDetailsToggle } from '../work-details-context';
import {
  approvalConversation,
  conversation,
  conversationWithBookkeeping,
  failedConversation,
} from './fixtures/conversation';
import { server } from '@/test/msw-server';

function tree({ running = false, latest = true, scope = 'alice', messages = conversation } = {}) {
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
              <WorkDetails messages={messages} running={running} latest={latest}>
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
  describe('when a completed turn is folded', () => {
    it('keeps every reply by default and reveals work on demand', async () => {
      render(tree());
      expect(screen.getByText('I will check the material first.')).toBeDefined();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      expect(screen.queryByRole('group', { name: 'Reasoning' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Hide work details' }).getAttribute('aria-expanded')).toBe('true');
    });
    it('hides intermediate replies only when final answer only is selected', async () => {
      render(tree());
      await choose('Replies when collapsed', 'Final answer only');
      expect(screen.queryByText('I will check the material first.')).toBeNull();
      expect(screen.getByText('The final story begins here.')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Show work details' }));
      expect(screen.getByText('I will check the material first.')).toBeDefined();
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
  describe('when a tool fails or waits for approval', () => {
    it('keeps the failure outside folded work groups', async () => {
      render(tree({ messages: failedConversation }));
      await choose('Work details', 'Compact');
      expect(screen.queryByRole('button', { name: 'Show work details' })).toBeNull();
      expect(screen.getByRole('group', { name: 'Reasoning' })).toBeDefined();
      expect(screen.getByText('I will check the material first.')).toBeDefined();
    });
    it('keeps the approval action accessible', async () => {
      render(tree({ messages: approvalConversation }));
      await choose('Work details', 'Compact');
      expect(screen.getByRole('button', { name: /Approve/ })).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Show work details' })).toBeNull();
    });
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
    it('adds a tool summary and a reasoning preview to the grouped steps', async () => {
      render(tree({ running: true }));
      await choose('Work details', 'Standard');
      const group = screen.getByRole('group', { name: 'Work details: 2 steps' });
      expect(group.textContent).toContain('story.txt');
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
