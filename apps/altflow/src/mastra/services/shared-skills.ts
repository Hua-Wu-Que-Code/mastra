import { realpath } from 'node:fs/promises';
import { relative, isAbsolute, resolve } from 'node:path';
import { LocalSkillSource } from '@mastra/core/workspace';
import type { SkillSource } from '@mastra/core/workspace';

/** Shared instructions are read-only and may not resolve outside the skills root. */
export class SharedSkillSource implements SkillSource {
  private readonly local: LocalSkillSource;
  constructor(private readonly root: string) {
    this.local = new LocalSkillSource({ basePath: root });
  }
  private async checked(path: string) {
    const base = await realpath(this.root),
      target = await realpath(resolve(this.root, path));
    const rel = relative(base, target);
    if (rel === '..' || rel.startsWith('../') || isAbsolute(rel))
      throw new Error('Skill path is outside the shared skills directory.');
    return target;
  }
  async exists(path: string) {
    try {
      await this.checked(path);
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
      throw error;
    }
  }
  async stat(path: string) {
    return this.local.stat(await this.checked(path));
  }
  async readFile(path: string) {
    return this.local.readFile(await this.checked(path));
  }
  async readdir(path: string) {
    return this.local.readdir(await this.checked(path));
  }
  async realpath(path: string) {
    return this.checked(path);
  }
}
