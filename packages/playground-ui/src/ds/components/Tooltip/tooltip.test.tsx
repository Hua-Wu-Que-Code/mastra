// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { InfoTooltip } from './info-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

afterEach(cleanup);

describe('Tooltip', () => {
  describe('when a control is hovered or focused', () => {
    it('keeps the action usable without opening a hint', async () => {
      const user = userEvent.setup();
      const click = vi.fn();
      render(
        <TooltipProvider delay={0}>
          <Tooltip>
            <TooltipTrigger render={<button onClick={click}>Save</button>} />
            <TooltipContent>Save your changes</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      await user.hover(button);
      await user.tab();
      await user.click(button);
      expect(click).toHaveBeenCalledOnce();
      expect(screen.queryByRole('tooltip')).toBeNull();
      expect(screen.queryByText('Save your changes')).toBeNull();
      expect(button.getAttribute('aria-describedby')).toBeNull();
    });
  });
  describe('when a caller requests open content', () => {
    it('does not mount a popup even when open or keepMounted is passed', () => {
      render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>Save</TooltipTrigger>
            <TooltipContent keepMounted>Save your changes</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      expect(screen.queryByText('Save your changes')).toBeNull();
    });
  });
  describe('when an icon button gets its name from a hint', () => {
    it('retains its accessible name and click action', async () => {
      const user = userEvent.setup();
      const click = vi.fn();
      render(
        <Button size="icon-md" tooltip="Close panel" onClick={click}>
          <svg />
        </Button>,
      );
      await user.click(screen.getByRole('button', { name: 'Close panel' }));
      expect(click).toHaveBeenCalledOnce();
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });
});

describe('InfoTooltip', () => {
  describe('when a section supplies an explanation', () => {
    it('does not leave an inactive information button behind', () => {
      render(<InfoTooltip aria-label="Version information">Each save creates a version.</InfoTooltip>);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Each save creates a version.')).toBeNull();
    });
  });

  it('opens on a tap and closes on the next tap or Escape, since touch has no hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <InfoTooltip aria-label="Version information">Each save creates a version.</InfoTooltip>
      </TooltipProvider>,
    );
    const icon = screen.getByRole('button', { name: 'Version information' });

    await user.pointer({ keys: '[TouchA]', target: icon });
    expect((await screen.findByRole('tooltip')).textContent).toContain('Each save creates a version.');

    await user.pointer({ keys: '[TouchA]', target: icon });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    await user.pointer({ keys: '[TouchA]', target: icon });
    await screen.findByRole('tooltip');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('does not open on a mouse click, which keeps hover as the only pointer trigger', async () => {
    const user = userEvent.setup({ skipHover: true });
    render(
      <TooltipProvider delay={0}>
        <InfoTooltip aria-label="Version information">Each save creates a version.</InfoTooltip>
      </TooltipProvider>,
    );

    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('button', { name: 'Version information' }) });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('describes an illustrated tooltip by its titles and captions, never its drawings', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <InfoTooltip aria-label="About alerting for each" variant="illustrated">
          <InfoTooltip.Panel title="All traffic" caption="One failing agent can be hidden by healthy ones.">
            <span data-testid="drawing" />
          </InfoTooltip.Panel>
          <InfoTooltip.Panel title="Each agent" caption="The failing agent gets its own alert.">
            <span />
          </InfoTooltip.Panel>
        </InfoTooltip>
      </TooltipProvider>,
    );

    expect(
      screen.getByRole('button', {
        name: 'About alerting for each',
        description:
          'All traffic One failing agent can be hidden by healthy ones. Each agent The failing agent gets its own alert.',
      }),
    ).toBeTruthy();

    await user.tab();
    await screen.findByRole('tooltip');
    expect(screen.getByTestId('drawing').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
