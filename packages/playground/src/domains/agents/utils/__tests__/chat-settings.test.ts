import { describe, expect, it } from 'vitest';
import { resolveChatSettings } from '../chat-settings';

describe('Chat settings', () => {
  describe('when removed composer settings remain in browser storage', () => {
    it('uses server defaults and only restores reasoning from the model picker', () => {
      const settings = resolveChatSettings(
        {
          modelSettings: {
            temperature: 0.7,
            maxSteps: 9,
            requireToolApproval: true,
            providerOptions: { openai: { serviceTier: 'auto', reasoningLevel: 'low' } },
          },
        },
        {
          modelSettings: {
            temperature: 0.2,
            topP: 0.4,
            maxSteps: 99,
            requireToolApproval: false,
            chatWithGenerate: true,
            chatWithNetwork: true,
            chatWithLegacyStream: true,
            providerOptions: { openai: { serviceTier: 'priority', reasoningLevel: 'high' } },
          },
        },
      );
      expect(settings.modelSettings).toMatchObject({
        temperature: 0.7,
        maxSteps: 9,
        requireToolApproval: true,
        chatWithGenerate: false,
        chatWithNetwork: false,
        chatWithLegacyStream: false,
        providerOptions: { openai: { serviceTier: 'auto', reasoningLevel: 'high' } },
      });
      expect(settings.modelSettings.topP).toBeUndefined();
    });
    it('leaves sampling and approval unset when the server supplies no defaults', () => {
      const { modelSettings } = resolveChatSettings(undefined, {
        modelSettings: {
          temperature: 1,
          topP: 1,
          requireToolApproval: true,
          seed: 12,
          maxRetries: 20,
        },
      });
      expect(modelSettings).toMatchObject({ maxSteps: 15, maxRetries: 2 });
      expect(modelSettings.temperature).toBeUndefined();
      expect(modelSettings.topP).toBeUndefined();
      expect(modelSettings.requireToolApproval).toBeUndefined();
      expect(modelSettings.seed).toBeUndefined();
    });
  });
});
