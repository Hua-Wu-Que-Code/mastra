import type { SkillMetadata } from '@mastra/client-js';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { useWorkspaceDirectory } from '@mastra/playground-ui/domains/workspace';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

const INSTALLED_SKILLS_PATH = '.agents/skills';

const normalizePath = (path: string) => path.replace(/^\.?\/+|\/+$/g, '');

export interface WorkspaceNoticesProps {
  workspaceId: string;
  /** File search needs `workspace.init()` to have indexed the workspace. */
  showInitWarning: boolean;
  /** Discovered skills; leave undefined while they load so nothing is flagged early. */
  skills?: Pick<SkillMetadata, 'name' | 'path'>[];
}

/** Page-level notices shown above the workspace tree. */
export function WorkspaceNotices({ workspaceId, showInitWarning, skills }: WorkspaceNoticesProps) {
  useLocale();
  // Same query as the tree's `.agents/skills` folder, so React Query shares the request.
  const { data: installed } = useWorkspaceDirectory({
    workspaceId: workspaceId,
    path: INSTALLED_SKILLS_PATH,
    queryOptions: { enabled: Boolean(skills) },
  });

  const undiscovered =
    skills && installed
      ? installed.filter(
          entry =>
            entry.type === 'directory' &&
            !skills.some(
              skill =>
                skill.name === entry.name || normalizePath(skill.path) === `${INSTALLED_SKILLS_PATH}/${entry.name}`,
            ),
        )
      : [];

  if (!showInitWarning && undiscovered.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
      {showInitWarning && (
        <Notice variant="warning">
          <Notice.Message>
            {studioT('File search requires') + ' '}
            <code>workspace.init()</code> {' ' + studioT('to index files from your configured')}{' '}
            <code>autoIndexPaths</code>.
          </Notice.Message>
        </Notice>
      )}
      {undiscovered.length > 0 && (
        <Notice variant="warning" title={studioT('Skills installed but not discovered')}>
          <Notice.Message>
            {undiscovered.map(entry => entry.name).join(', ')}{' '}
            {undiscovered.length === 1 ? studioT('is') : studioT('are')} {' ' + studioT('in')}{' '}
            <code>{INSTALLED_SKILLS_PATH}</code>{' '}
            {' ' + studioT('but not discovered. Add this path to your workspace skills configuration to see') + ' '}
            {undiscovered.length === 1 ? studioT('it') : studioT('them')}.
          </Notice.Message>
        </Notice>
      )}
    </div>
  );
}
