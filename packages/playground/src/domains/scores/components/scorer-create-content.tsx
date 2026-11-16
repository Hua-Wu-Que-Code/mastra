import type { CreateStoredScorerParams } from '@mastra/client-js';
import { Form } from '@mastra/playground-ui/components/Form';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useStoredScorerMutations } from '@mastra/react/hooks/scores';
import { useRef } from 'react';

import { ScorerEditMain } from './scorer-edit-page/scorer-edit-main';
import { ScorerEditSidebar } from './scorer-edit-page/scorer-edit-sidebar';
import { useScorerEditForm } from './scorer-edit-page/use-scorer-edit-form';
import { AgentEditLayout } from '@/domains/agents/components/agent-edit-page/agent-edit-layout';

interface ScorerCreateContentProps {
  onSuccess?: (scorer: { id: string }) => void;
}

export function ScorerCreateContent({ onSuccess }: ScorerCreateContentProps) {
  useLocale();
  const { createStoredScorer } = useStoredScorerMutations();
  const formRef = useRef<HTMLFormElement | null>(null);
  const { form } = useScorerEditForm();

  const handlePublish = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(studioT('Please fill in all required fields'));
      return;
    }

    const values = form.getValues();

    try {
      const createParams: CreateStoredScorerParams = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        model: values.model,
        instructions: values.instructions || undefined,
        scoreRange: values.scoreRange,
        defaultSampling:
          values.defaultSampling?.type === 'ratio' && typeof values.defaultSampling.rate === 'number'
            ? values.defaultSampling
            : { type: 'none' as const },
      };

      const created = await createStoredScorer.mutateAsync(createParams);
      toast.success(studioT('Scorer created successfully'));
      onSuccess?.(created);
    } catch (error) {
      toast.error(
        studioT('Failed to create scorer: {value0}', {
          value0: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  };

  return (
    <AgentEditLayout
      leftSlot={
        <ScorerEditSidebar
          form={form}
          onPublish={handlePublish}
          isSubmitting={createStoredScorer.isPending}
          formRef={formRef}
        />
      }
    >
      <Form ref={formRef} className="h-full">
        <ScorerEditMain form={form} />
      </Form>
    </AgentEditLayout>
  );
}
