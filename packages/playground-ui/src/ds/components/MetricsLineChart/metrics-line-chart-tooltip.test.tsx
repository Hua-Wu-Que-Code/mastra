import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetricsLineChartTooltip } from './metrics-line-chart-tooltip';

const payload = [
  { name: '2xx', value: 3420, color: 'green' },
  { name: '5xx', value: 311, color: 'red' },
];

describe('MetricsLineChartTooltip', () => {
  describe('when the chart has an active point', () => {
    it('renders no hover hint even with totals and custom formatters', () => {
      const html = renderToStaticMarkup(
        <MetricsLineChartTooltip
          active
          label="5 PM"
          payload={payload}
          showTotal
          formatByKey={{ wake: v => v + 'ms' }}
        />,
      );
      expect(html).toBe('');
    });
  });
});
