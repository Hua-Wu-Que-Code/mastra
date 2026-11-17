// @vitest-environment jsdom
import { SidebarProvider, useSidebar } from '@mastra/playground-ui/components/Sidebar';
import { KeyboardShortcutsProvider } from '@mastra/playground-ui/keyboard/keyboard-shortcuts-context';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarShortcuts } from '@/domains/navigation/components/sidebar-shortcuts';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const StateProbe = () => {
  const { state } = useSidebar();
  return <div data-testid="sidebar-state">{state}</div>;
};

const renderSidebar = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <KeyboardShortcutsProvider>
        <SidebarProvider>
          <SidebarShortcuts />
          <StateProbe />
          <textarea data-testid="composer" />
        </SidebarProvider>
      </KeyboardShortcutsProvider>
    </MemoryRouter>,
  );

const sidebarState = () => screen.getByTestId('sidebar-state').textContent;

beforeEach(() => {
  window.localStorage.clear();
  mockMatchMedia(false); // desktop
});

afterEach(() => cleanup());

describe('SidebarShortcuts', () => {
  it('pressing [ collapses an open sidebar', () => {
    renderSidebar();
    expect(sidebarState()).toBe('default');

    fireEvent.keyDown(window, { key: '[' });

    expect(sidebarState()).toBe('collapsed');
  });

  it('pressing [ again re-expands it', () => {
    renderSidebar();

    fireEvent.keyDown(window, { key: '[' });
    expect(sidebarState()).toBe('collapsed');

    fireEvent.keyDown(window, { key: '[' });
    expect(sidebarState()).toBe('default');
  });

  it('[ typed inside a textarea does not toggle the sidebar', () => {
    renderSidebar();

    fireEvent.keyDown(screen.getByTestId('composer'), { key: '[' });

    expect(sidebarState()).toBe('default');
  });

  it('preserves the conversation panel shortcut after moving the list', () => {
    renderSidebar('/agents/creator-agent/threads/new');
    fireEvent.keyDown(window, { key: '{', shiftKey: true });
    expect(sidebarState()).toBe('collapsed');
  });

  it('{ does not toggle the sidebar outside agent conversations', () => {
    renderSidebar();

    fireEvent.keyDown(window, { key: '{', shiftKey: true });

    expect(sidebarState()).toBe('default');
  });
});
