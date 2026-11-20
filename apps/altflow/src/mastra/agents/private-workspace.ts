import type { MastraCompositeStore } from '@mastra/core/storage';
import { Workspace } from '@mastra/core/workspace';
import { resolvePublishedSkills } from '../services/shared-skills';
import { UserFilesystem } from '../user-filesystem';
import type { UserStorage } from '../user-storage';

export function createPrivateWorkspace(files: UserStorage, storage: MastraCompositeStore) {
  return async (userId: string) => {
    const workspace = new Workspace({
      id: `files-${userId}`,
      name: '我的文件',
      filesystem: new UserFilesystem(files, userId),
      skills: ['.'],
      skillSource: await resolvePublishedSkills(storage),
    });
    await workspace.init();
    return workspace;
  };
}
