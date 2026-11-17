import type { AgentSettingsType } from '@/types';

export const defaultSettings: AgentSettingsType = {
  modelSettings: { maxRetries: 2, maxSteps: 15, requireToolApproval: false },
};

/** Browser preferences only own reasoning; execution and sampling defaults belong to the agent. */
export function resolveChatSettings(
  agentDefaults?: AgentSettingsType,
  preferences?: AgentSettingsType,
): AgentSettingsType {
  const providerOptions = { ...agentDefaults?.modelSettings.providerOptions };
  for (const [provider, options] of Object.entries(preferences?.modelSettings.providerOptions ?? {})) {
    if (typeof options.reasoningLevel !== 'string') continue;
    providerOptions[provider] = { ...providerOptions[provider], reasoningLevel: options.reasoningLevel };
  }
  return {
    modelSettings: {
      ...defaultSettings.modelSettings,
      ...agentDefaults?.modelSettings,
      ...(Object.keys(providerOptions).length ? { providerOptions } : {}),
      // Select the available streaming transport automatically, never from old browser flags.
      chatWithGenerateLegacy: false,
      chatWithGenerate: false,
      chatWithLegacyStream: false,
      chatWithNetwork: false,
    },
  };
}
