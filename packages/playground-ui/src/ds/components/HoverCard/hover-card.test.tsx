// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

afterEach(cleanup);

describe('HoverCard', () => {
  describe('when a preview link is hovered', () => {
    it('preserves navigation without opening a preview', async () => {
      const user = userEvent.setup();
      render(
        <HoverCard>
          <HoverCardTrigger href="/knowledge/page">Knowledge page</HoverCardTrigger>
          <HoverCardContent>Page preview</HoverCardContent>
        </HoverCard>,
      );
      const link = screen.getByRole('link', { name: 'Knowledge page' });
      await user.hover(link);
      await user.tab();
      expect(link.getAttribute('href')).toBe('/knowledge/page');
      expect(screen.queryByText('Page preview')).toBeNull();
    });
  });
  describe('when a caller requests an open preview', () => {
    it('does not mount it', () => {
      render(
        <HoverCard defaultOpen>
          <HoverCardTrigger render={<button>Details</button>} />
          <HoverCardContent>Page preview</HoverCardContent>
        </HoverCard>,
      );
      expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
      expect(screen.queryByText('Page preview')).toBeNull();
    });
  });
});
