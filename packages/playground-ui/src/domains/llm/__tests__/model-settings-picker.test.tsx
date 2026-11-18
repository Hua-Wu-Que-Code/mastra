// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { ModelSettingsPicker } from '../model-settings-picker';

function TeamPicker() {
  const [enabled, setEnabled] = useState(true);
  return <ModelSettingsPicker providers={[]} onValueChange={() => {}} teamwork={{ enabled, hasMessages: true, onChange: setEnabled }} />;
}
afterEach(cleanup);
describe('ModelSettingsPicker', () => {
  describe('when teamwork is disabled in a used conversation', () => {
    it('keeps teamwork on until the user confirms', async () => {
      render(<TeamPicker />);
      fireEvent.click(screen.getByRole('button', { name: /Model:/ }));
      fireEvent.click(screen.getByRole('button', { name: /Agent teamwork/ }));
      fireEvent.click(screen.getByRole('switch', { name: 'Enable agent teamwork' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Shared tasks and agents are kept. Running sub-agents continue working.')).toBeTruthy();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByRole('button', { name: /Model:/ }));
      fireEvent.click(screen.getByRole('button', { name: /Agent teamwork/ }));
      expect(screen.getByRole('switch', { name: 'Enable agent teamwork' }).getAttribute('aria-checked')).toBe('true');
      fireEvent.click(screen.getByRole('switch', { name: 'Enable agent teamwork' }));
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Turn off' }));
      fireEvent.click(screen.getByRole('button', { name: /Model:/ }));
      fireEvent.click(screen.getByRole('button', { name: /Agent teamwork/ }));
      expect(screen.getByRole('switch', { name: 'Enable agent teamwork' }).getAttribute('aria-checked')).toBe('false');
    });
  });
});
