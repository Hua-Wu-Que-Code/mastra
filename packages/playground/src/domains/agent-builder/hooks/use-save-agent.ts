import type { StoredSkillResponse } from '@mastra/client-js';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useStoredAgentMutations } from '@mastra/react/hooks/agents';
import { useCallback } from 'react';
import type { AgentBuilderEditFormValues } from '../schemas';
import { formValuesToSaveParams } from '../services/form-values-to-save-params';
import type { AgentTool } from '../types/agent-tool';
import { isModelNotAllowedError } from '../utils/is-model-not-allowed';
import { useDefaultVisibility } from '@/domains/auth/hooks/use-default-visibility';

interface UseSaveAgentArgs {
  agentId: string;
  availableAgentTools?: AgentTool[];
  availableSkills?: StoredSkillResponse[];
  onSuccess?: (agentId: string) => void;
  silent?: boolean;
}

export function useSaveAgent({
  agentId,
  availableAgentTools = [],
  availableSkills = [],
  onSuccess,
  silent = false,
}: UseSaveAgentArgs) {
  const studioLocale = useLocale();
  const { updateStoredAgent } = useStoredAgentMutations({ agentId: agentId });
  const defaultVisibility = useDefaultVisibility();

  const save = useCallback(
    async (values: AgentBuilderEditFormValues) => {
      const params = formValuesToSaveParams(values, availableAgentTools, availableSkills);
      const visibility = params.visibility ?? defaultVisibility;
      const workspaceField = params.workspace ? { workspace: params.workspace } : {};
      const browserField = { browser: params.browser };
      const metadataField = params.metadata ? { metadata: params.metadata } : {};
      // Only forward `toolProviders` when the form actually produced a value.
      // Conditional (code-authored) toolProviders surface as `undefined` from
      // `extractFormToolProviders`; omitting the field on update lets the
      // server preserve the original stored shape.
      const toolProvidersField = params.toolProviders ? { toolProviders: params.toolProviders } : {};

      try {
        const updated = await updateStoredAgent.mutateAsync({
          autoPublish: true,
          name: params.name,
          description: params.description,
          instructions: params.instructions,
          tools: params.tools,
          agents: params.agents,
          workflows: params.workflows,
          skills: params.skills,
          visibility,
          model: params.model,
          ...workspaceField,
          ...browserField,
          ...metadataField,
          ...toolProvidersField,
        });
        if (!silent) toast.success(studioT('Agent updated'));
        onSuccess?.(agentId);
        return updated;
      } catch (error) {
        const policyDetails = isModelNotAllowedError(error);
        if (policyDetails) {
          toast.error(policyDetails.message);
        } else {
          toast.error(
            studioT('Failed to save agent: {value0}', {
              value0: error instanceof Error ? error.message : 'Unknown error',
            }),
          );
        }
        throw error;
      }
    },
    [
      agentId,
      availableAgentTools,
      availableSkills,
      updateStoredAgent,
      onSuccess,
      defaultVisibility,
      silent,
      studioLocale,
    ],
  );

  return { save, isSaving: updateStoredAgent.isPending };
}
