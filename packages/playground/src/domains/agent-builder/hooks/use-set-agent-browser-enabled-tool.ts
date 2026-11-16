import { createTool } from '@mastra/client-js';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod-v4';

import type { AgentBuilderEditFormValues } from '@/domains/agent-builder/schemas';

export const SET_AGENT_BROWSER_ENABLED_TOOL_NAME = 'set-agent-browser-enabled';

export function useSetAgentBrowserEnabledTool() {
  const studioLocale = useLocale();
  const formMethods = useFormContext<AgentBuilderEditFormValues>();

  return useMemo(
    () =>
      createTool({
        id: SET_AGENT_BROWSER_ENABLED_TOOL_NAME,
        description: studioT(
          'Enable or disable browser access for the agent. Set `browserEnabled` to true to let the agent browse the web.',
        ),
        inputSchema: z.object({
          browserEnabled: z
            .boolean()
            .describe('Whether to enable browser access for this agent. Set to true to let the agent browse the web.'),
        }),
        outputSchema: z.object({ success: z.boolean() }),
        execute: async (inputData: any) => {
          if (typeof inputData?.browserEnabled === 'boolean') {
            formMethods.setValue('browserEnabled', inputData.browserEnabled, { shouldDirty: true });
          }
          return { success: true };
        },
      }),
    [formMethods, studioLocale],
  );
}
