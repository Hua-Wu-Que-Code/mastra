import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishSkillFromSource } from '@mastra/core/workspace';
import { LibSQLStore } from '@mastra/libsql';
import { SharedSkillSource } from '../src/mastra/services/shared-skills.ts';
import './environment.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const runtimeRoot = resolve(process.env.ALTFLOW_RUNTIME_ROOT ?? process.env.MASTRA_PREVIEW_ROOT ?? appRoot);
const skillsPath = resolve(runtimeRoot, 'workspace/skills');
const source = new SharedSkillSource(skillsPath);
const storage = new LibSQLStore({
  id: 'seed-shared-skills',
  url: `file:${resolve(runtimeRoot, 'src/mastra/public/preview.db')}`,
});
const seedMarker = 'altflowWorkspaceSeed';
const [skills, blobs] = await Promise.all([storage.getStore('skills'), storage.getStore('blobs')]);

for (const entry of await readdir(skillsPath, { withFileTypes: true })) {
  const id = entry.name;
  if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9_-]*$/i.test(id) || !(await source.exists(`${id}/SKILL.md`))) {
    continue;
  }
  const existing = await skills.getById(id);
  if (existing && (existing.status !== 'draft' || existing.visibility !== 'public' || existing.activeVersionId))
    continue;

  if (!existing) {
    const { snapshot, tree, files } = await publishSkillFromSource(source, id, blobs);
    await skills.create({
      skill: {
        ...snapshot,
        id,
        visibility: 'public',
        tree,
        files,
        metadata: { ...snapshot.metadata, [seedMarker]: true },
      },
    });
  }

  // An interrupted import can finish its own initial version without activating a Studio draft.
  const version = await skills.getLatestVersion(id);
  if (version?.versionNumber !== 1 || version.metadata?.[seedMarker] !== true || !version.tree) continue;
  await skills.update({ id, activeVersionId: version.id });
  console.log(`Published shared skill ${id} (v1)`);
}
