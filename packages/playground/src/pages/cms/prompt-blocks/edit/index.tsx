import type { StoredPromptBlockResponse, UpdateStoredPromptBlockParams } from '@mastra/client-js';
import { Button } from '@mastra/playground-ui/components/Button';
import { EmptyState } from '@mastra/playground-ui/components/EmptyState';
import { Form } from '@mastra/playground-ui/components/Form';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { PageLayout } from '@mastra/playground-ui/components/PageLayout';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { IconEyeOpen } from '@mastra/playground-ui/icons/central/IconEyeOpen';
import { IconRocket } from '@mastra/playground-ui/icons/central/IconRocket';
import { useLinkComponent } from '@mastra/playground-ui/lib/framework';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useMastraClient } from '@mastra/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { AgentEditLayout } from '@/domains/agents/components/agent-edit-page/agent-edit-layout';
import { CmsEditHeaderActions } from '@/domains/cms/components/cms-edit-header-actions';
import { useIsCmsAvailable } from '@/domains/cms/hooks/use-is-cms-available';
import { navCrumb } from '@/domains/navigation/crumbs';
import type { PromptBlockFormValues } from '@/domains/prompt-blocks';
import {
  useStoredPromptBlock,
  useStoredPromptBlockMutations,
  usePromptBlockVersions,
  usePromptBlockVersion,
  PromptBlockEditMain,
  PromptBlockEditSidebar,
  PromptBlockVersionCombobox,
  usePromptBlockEditForm,
  DeletePromptBlockAction,
} from '@/domains/prompt-blocks';
import { PromptBlockCrumb } from '@/domains/prompt-blocks/prompt-block-crumb';

const crumbs = [navCrumb('/prompts'), { id: 'prompt-block', Component: PromptBlockCrumb }];

type StoredPromptBlockData = StoredPromptBlockResponse;

function buildUpdateParams(values: PromptBlockFormValues): UpdateStoredPromptBlockParams {
  return {
    name: values.name,
    description: values.description || undefined,
    content: values.content,
    rules: values.rules || undefined,
    requestContextSchema: (values.variables as Record<string, unknown>) || undefined,
  };
}

interface CmsPromptBlocksEditFormProps {
  block: StoredPromptBlockData;
  blockId: string;
  selectedVersionId: string | null;
  hasDraft: boolean;
  latestVersionId?: string;
  activeVersionId?: string;
  onClearVersion: () => void;
}

function CmsPromptBlocksEditForm({
  block,
  blockId,
  selectedVersionId,
  hasDraft,
  latestVersionId,
  activeVersionId,
  onClearVersion,
}: CmsPromptBlocksEditFormProps) {
  const studioLocale = useLocale();
  const client = useMastraClient();
  const queryClient = useQueryClient();
  const { navigate, paths } = useLinkComponent();
  const { updateStoredPromptBlock } = useStoredPromptBlockMutations({ blockId: blockId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const { data: versionData } = usePromptBlockVersion({
    blockId,
    versionId: selectedVersionId ?? '',
    queryOptions: { enabled: !!blockId && !!selectedVersionId },
  });

  const isViewingVersion = !!selectedVersionId && !!versionData;
  const isViewingPreviousVersion = isViewingVersion && selectedVersionId !== latestVersionId;
  const dataSource = isViewingVersion ? versionData : block;

  const initialValues: PromptBlockFormValues = useMemo(
    () => ({
      name: dataSource.name || '',
      description: dataSource.description || '',
      content: dataSource.content || '',
      rules: dataSource.rules,
      variables: dataSource.requestContextSchema as PromptBlockFormValues['variables'],
    }),
    [dataSource],
  );

  const { form } = usePromptBlockEditForm({ initialValues });
  const [formResetKey, setFormResetKey] = useState(0);

  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
      setFormResetKey(prev => prev + 1);
    }
  }, [initialValues, form]);

  const handleSaveDraft = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(studioT('Please fill in all required fields'));
      return;
    }

    setIsSavingDraft(true);
    try {
      const params = buildUpdateParams(form.getValues());
      await updateStoredPromptBlock.mutateAsync(params);
      form.reset(form.getValues());
      toast.success(studioT('Draft saved'));
    } catch (error) {
      toast.error(
        studioT('Failed to save draft: {value0}', { value0: error instanceof Error ? error.message : 'Unknown error' }),
      );
    } finally {
      setIsSavingDraft(false);
    }
  }, [form, updateStoredPromptBlock, studioLocale]);

  const handlePublish = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(studioT('Please fill in all required fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      const params = buildUpdateParams(form.getValues());
      await updateStoredPromptBlock.mutateAsync(params);

      // Fetch latest version after save and activate it
      const versionsResponse = await client
        .getStoredPromptBlock(blockId)
        .listVersions({ orderBy: { direction: 'DESC' }, perPage: 1 });
      const latestVersion = versionsResponse.versions[0];
      if (!latestVersion) {
        throw new Error('No version found to publish');
      }
      await client.getStoredPromptBlock(blockId).activateVersion(latestVersion.id);

      void queryClient.invalidateQueries({ queryKey: ['stored-prompt-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['stored-prompt-block'] });
      void queryClient.invalidateQueries({ queryKey: ['prompt-block-versions', blockId] });
      toast.success(studioT('Prompt block published'));
      navigate(paths.promptBlocksLink());
    } catch (error) {
      toast.error(
        studioT('Failed to publish: {value0}', { value0: error instanceof Error ? error.message : 'Unknown error' }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [form, updateStoredPromptBlock, client, blockId, navigate, paths, queryClient, studioLocale]);

  const handlePublishVersion = useCallback(async () => {
    if (isViewingPreviousVersion && selectedVersionId) {
      setIsSubmitting(true);
      try {
        await client.getStoredPromptBlock(blockId).activateVersion(selectedVersionId);
        void queryClient.invalidateQueries({ queryKey: ['stored-prompt-blocks'] });
        void queryClient.invalidateQueries({ queryKey: ['stored-prompt-block'] });
        void queryClient.invalidateQueries({ queryKey: ['prompt-block-versions', blockId] });
        toast.success(studioT('Version published'));
        navigate(paths.promptBlocksLink());
      } catch (error) {
        toast.error(
          studioT('Failed to publish version: {value0}', {
            value0: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      await handlePublish();
    }
  }, [
    handlePublish,
    isViewingPreviousVersion,
    selectedVersionId,
    client,
    blockId,
    queryClient,
    navigate,
    paths,
    studioLocale,
  ]);

  return (
    <AgentEditLayout
      leftSlot={
        <PromptBlockEditSidebar
          form={form}
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
          isSavingDraft={isSavingDraft}
          isDirty={form.formState.isDirty}
          hasDraft={hasDraft}
          formResetKey={formResetKey}
          mode="edit"
          blockId={blockId}
        />
      }
    >
      {isViewingPreviousVersion && (
        <Notice variant="info" title={studioT('This is a previous version')} className="m-4 mb-0">
          <Notice.Message>{studioT('You are seeing a specific version of the prompt block.')}</Notice.Message>
          <div className="flex gap-2">
            <Button icon={<IconEyeOpen />} type="button" variant="default" size="sm" onClick={onClearVersion}>
              {studioT('View latest version')}
            </Button>
            <Button
              icon={<IconRocket />}
              type="button"
              variant="default"
              size="sm"
              onClick={handlePublishVersion}
              disabled={selectedVersionId === activeVersionId || isSubmitting}
            >
              {isSubmitting ? studioT('Publishing...') : studioT('Publish this version')}
            </Button>
          </div>
        </Notice>
      )}
      <Form className="h-full">
        <PromptBlockEditMain form={form} formResetKey={formResetKey} />
      </Form>
    </AgentEditLayout>
  );
}

function CmsPromptBlocksEditPage() {
  useLocale();
  const { promptBlockId: blockId } = useParams<{ promptBlockId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedVersionId = searchParams.get('versionId');

  const { isCmsAvailable } = useIsCmsAvailable();
  const { data: block, isLoading } = useStoredPromptBlock({
    blockId: blockId,
    status: 'draft',
    queryOptions: { enabled: Boolean(blockId) },
  });
  const { data: versionsData } = usePromptBlockVersions({
    blockId: blockId ?? '',
    params: { orderBy: { direction: 'DESC' } },
    queryOptions: { enabled: !!blockId },
  });

  const activeVersionId = block?.activeVersionId;
  const latestVersion = versionsData?.versions?.[0];
  const hasDraft = !!(latestVersion && (!activeVersionId || latestVersion.id !== activeVersionId));

  const handleVersionSelect = useCallback(
    (versionId: string) => {
      if (versionId) {
        setSearchParams({ versionId });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  const handleClearVersion = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  if (isLoading) {
    return (
      <PageLayout variant="fit" breadcrumbs={<PageBreadcrumbs crumbs={crumbs} />}>
        <h1 className="sr-only">{blockId}</h1>
        <AgentEditLayout leftSlot={<Spinner fill size="lg" />}>
          <Spinner fill size="lg" />
        </AgentEditLayout>
      </PageLayout>
    );
  }

  if (!block || !blockId) {
    return (
      <PageLayout variant="fit" breadcrumbs={<PageBreadcrumbs crumbs={crumbs} />}>
        <h1 className="sr-only">{blockId}</h1>
        <AgentEditLayout leftSlot={<EmptyState variant="fill" titleSlot={studioT('Prompt block not found')} />}>
          <EmptyState variant="fill" titleSlot={studioT('Prompt block not found')} />
        </AgentEditLayout>
      </PageLayout>
    );
  }

  const actions = (
    <CmsEditHeaderActions hasDraft={hasDraft}>
      <PromptBlockVersionCombobox
        blockId={blockId}
        value={selectedVersionId ?? ''}
        onValueChange={handleVersionSelect}
        variant="ghost"
        activeVersionId={activeVersionId}
      />
      {isCmsAvailable && <DeletePromptBlockAction blockId={blockId} blockName={block.name} />}
    </CmsEditHeaderActions>
  );

  return (
    <PageLayout variant="fit" breadcrumbs={<PageBreadcrumbs crumbs={crumbs} />} headerActions={actions}>
      <h1 className="sr-only">{blockId}</h1>
      <CmsPromptBlocksEditForm
        block={block}
        blockId={blockId}
        selectedVersionId={selectedVersionId}
        hasDraft={hasDraft}
        latestVersionId={latestVersion?.id}
        activeVersionId={activeVersionId}
        onClearVersion={handleClearVersion}
      />
    </PageLayout>
  );
}

export { CmsPromptBlocksEditPage };

export default CmsPromptBlocksEditPage;
