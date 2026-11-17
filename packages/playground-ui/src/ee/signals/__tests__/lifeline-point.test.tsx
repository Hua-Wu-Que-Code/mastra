// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

import { LifelinePoint } from '../lifeline-point';

describe('LifelinePoint', () => {
  describe('when the point does not select a theme', () => {
    it('keeps its accessible label without an inactive tab stop', () => {
      const { container } = render(
        <LifelinePoint title="Snapshot A" positionPercent={20} height={12} color="blue" onSelect={undefined} />,
      );
      expect(screen.getByRole('img', { name: 'Snapshot A' }).tabIndex).toBe(-1);
      expect(container.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('does not render without a timeline position', () => {
      render(
        <LifelinePoint
          title="Unlinked theme"
          positionPercent={undefined}
          height={12}
          color="green"
          onSelect={undefined}
        />,
      );

      expect(screen.queryByRole('img', { name: 'Unlinked theme' })).toBeNull();
    });
  });
});

describe('LifelinePoint — when the point selects a theme', () => {
  const renderPoint = (props: Partial<Parameters<typeof LifelinePoint>[0]> = {}) =>
    render(
      <LifelinePoint
        title="Linked theme · Jul 1, 2026"
        positionPercent={25}
        height={12}
        color="rebeccapurple"
        onSelect={() => {}}
        {...props}
      />,
    );

  it('offers itself as a button', () => {
    renderPoint();

    expect(screen.getByRole('button', { name: /Linked theme/ })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('reports being chosen', () => {
    const onSelect = vi.fn();
    renderPoint({ onSelect });

    fireEvent.click(screen.getByRole('button', { name: /Linked theme/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('keeps hover free of a popup', () => {
    renderPoint();
    const point = screen.getByRole('button', { name: /Linked theme/ });

    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(point);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseLeave(point);
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(point.getAttribute('aria-describedby')).toBeNull();
  });

  it('keeps focus free of a popup', () => {
    renderPoint();
    const point = screen.getByRole('button', { name: /Linked theme/ });

    fireEvent.focus(point);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.blur(point);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not position a popup above the point', () => {
    renderPoint();
    const point = screen.getByRole('button', { name: /Linked theme/ });
    point.getBoundingClientRect = () => ({
      left: 100,
      top: 200,
      width: 40,
      height: 12,
      right: 140,
      bottom: 212,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    });

    fireEvent.mouseEnter(point);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not mount a popup outside the timeline', () => {
    const { container } = renderPoint();

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Linked theme/ }));

    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('sits where the timeline puts it, in the colour it was given', () => {
    renderPoint({ positionPercent: 62.5, height: 20, color: 'rgb(0, 128, 0)' });

    const point = screen.getByRole('button', { name: /Linked theme/ });
    expect(point.style.left).toBe('62.5%');
    expect(point.style.height).toBe('20px');
    expect(point.style.backgroundColor).toBe('rgb(0, 128, 0)');
  });

  it('does not render without a timeline position', () => {
    renderPoint({ positionPercent: undefined });

    expect(screen.queryByRole('button', { name: /Linked theme/ })).toBeNull();
  });
});
