import { Workspace } from '@mastra/core/workspace';
import { SharedSkillSource } from '../services/shared-skills';
import { UserFilesystem } from '../user-filesystem';
import type { UserStorage } from '../user-storage';

export function createPrivateWorkspace(files: UserStorage, skillsPath: string) {
  const source = new SharedSkillSource(skillsPath);
  return async (userId: string) => {
    const workspace = new Workspace({
      id: `files-${userId}`,
      name: '我的文件',
      filesystem: new UserFilesystem(files, userId),
      skills: ['.'],
      skillSource: source,
    });
    await workspace.init();
    return workspace;
  };
}
