// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScatterPlotChart } from './scatter-plot-chart';
import { ScatterPlotChartTooltip } from './scatter-plot-chart-tooltip';
import {
  formatScatterPlotAxisTick,
  getScatterPlotClickedPoint,
  getScatterPlotPointColor,
} from './scatter-plot-chart-utils';

afterEach(() => {
  cleanup();
});

describe('ScatterPlotChart', () => {
  it('renders an empty state when no data is available', () => {
    render(<ScatterPlotChart data={[]} xKey="duration" yKey="cost" />);

    expect(screen.getByText('No data to display')).not.toBeNull();
  });

  it('keeps formatted axis ticks on a single line', () => {
    expect(formatScatterPlotAxisTick(12, value => `${value} spans`)).toBe('12\u00A0spans');
  });

  it('uses design tokens as the default point color', () => {
    expect(getScatterPlotPointColor({ id: 'trace-a' })).toBe('var(--chart-blue)');
  });

  it('supports render-only color overrides from each datum', () => {
    expect(getScatterPlotPointColor({ id: 'trace-a', color: 'var(--chart-blue-deep)' }, 'color')).toBe(
      'var(--chart-blue-deep)',
    );
    expect(getScatterPlotPointColor({ id: 'trace-a', color: 12 }, 'color')).toBe('var(--chart-blue)');
  });

  it('extracts clicked point payloads from Recharts event payloads', () => {
    const point = { id: 'trace-a', duration: 120, cost: 0.4 };

    expect(getScatterPlotClickedPoint({ payload: point })).toBe(point);
    expect(getScatterPlotClickedPoint(undefined)).toBeUndefined();
  });
});

describe('ScatterPlotChartTooltip', () => {
  describe('when a point is active', () => {
    it('renders no hover hint', () => {
      const { container } = render(
        <ScatterPlotChartTooltip
          active
          payload={[{ payload: { id: 'trace-a', duration: 120, cost: 0.4 } }]}
          xKey="duration"
          yKey="cost"
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
