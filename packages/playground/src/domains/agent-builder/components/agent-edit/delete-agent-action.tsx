import { AlertDialog } from '@mastra/playground-ui/components/AlertDialog';
import { Button } from '@mastra/playground-ui/components/Button';
import { DropdownMenu } from '@mastra/playground-ui/components/DropdownMenu';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useStoredAgentMutations, useStoredAgentDependents } from '@mastra/react/hooks/agents';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AgentImpactWarnings } from './agent-impact-warnings';

interface UseDeleteAgentActionParams {
  agentId: string;
  agentName: string;
}

const useDeleteAgentAction = ({ agentId }: UseDeleteAgentActionParams) => {
  useLocale();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { deleteStoredAgent } = useStoredAgentMutations({ agentId: agentId });

  const confirm = async () => {
    try {
      await deleteStoredAgent.mutateAsync(undefined);
      toast.success(studioT('Agent deleted'));
      setOpen(false);
      void navigate('/agent-builder/agents', { viewTransition: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : studioT('Failed to delete agent'));
    }
  };

  return {
    open,
    setOpen,
    isPending: deleteStoredAgent.isPending,
    confirm,
  };
};

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  isPending: boolean;
  onConfirm: () => void;
}

const DeleteAgentDialog = ({
  open,
  onOpenChange,
  agentId,
  agentName,
  isPending,
  onConfirm,
}: DeleteAgentDialogProps) => {
  useLocale();
  const { isLoading: isDependentsLoading } = useStoredAgentDependents({
    agentId: agentId,
    queryOptions: { enabled: Boolean(agentId) && open },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content data-testid="agent-builder-delete-agent-dialog">
        <AlertDialog.Header>
          <AlertDialog.Title>{studioT('Delete agent?')}</AlertDialog.Title>
          <AlertDialog.Description>
            {studioT('This permanently deletes "')}
            {agentName}
            {studioT('" and removes its conversation history. This cannot be undone.')}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Body>
          <AgentImpactWarnings agentId={agentId} variant="delete" enabled={open} />
        </AlertDialog.Body>
        <AlertDialog.Footer>
          <AlertDialog.Cancel data-testid="agent-builder-delete-agent-cancel" disabled={isPending}>
            {studioT('Cancel')}
          </AlertDialog.Cancel>
          <Button
            icon={<TrashIcon />}
            variant="destructive"
            data-testid="agent-builder-delete-agent-confirm"
            disabled={isPending || isDependentsLoading}
            onClick={() => {
              onConfirm();
            }}
          >
            {isPending ? studioT('Deleting…') : studioT('Delete agent')}
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
};

interface DeleteAgentEntryProps {
  agentId: string;
  agentName: string;
  disabled?: boolean;
}

export const DeleteAgentPanelButton = ({ agentId, agentName, disabled = false }: DeleteAgentEntryProps) => {
  useLocale();
  const { open, setOpen, isPending, confirm } = useDeleteAgentAction({ agentId, agentName });

  return (
    <>
      <Button
        icon={<TrashIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled || isPending}
        data-testid="agent-builder-delete-agent"
        variant="ghost"
        size="sm"
      >
        {studioT('Delete agent')}
      </Button>
      <DeleteAgentDialog
        open={open}
        onOpenChange={setOpen}
        agentId={agentId}
        agentName={agentName}
        isPending={isPending}
        onConfirm={confirm}
      />
    </>
  );
};

export const DeleteAgentMenuItem = ({ agentId, agentName, disabled = false }: DeleteAgentEntryProps) => {
  useLocale();
  const { open, setOpen, isPending, confirm } = useDeleteAgentAction({ agentId, agentName });

  return (
    <>
      <DropdownMenu.Item
        data-testid="agent-builder-mobile-menu-delete"
        disabled={disabled}
        variant="destructive"
        onSelect={event => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <TrashIcon />
        <span>{studioT('Delete agent')}</span>
      </DropdownMenu.Item>
      <DeleteAgentDialog
        open={open}
        onOpenChange={setOpen}
        agentId={agentId}
        agentName={agentName}
        isPending={isPending}
        onConfirm={confirm}
      />
    </>
  );
};
