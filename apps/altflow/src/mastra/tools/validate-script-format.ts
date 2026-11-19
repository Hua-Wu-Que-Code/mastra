import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export interface ScriptFormatIssue {
  /** Stable rule code, e.g. "场景编号". */
  rule: string;
  message: string;
  /** 1-based line; -1 for whole-script problems. */
  lineNumber: number;
}

export interface ScriptFormatResult {
  valid: boolean;
  issues: ScriptFormatIssue[];
  stats: { episodes: number; scenes: number; branchScenes: number; interactions: number; options: number };
}

const EPISODE = /^(?:#+\s*)?(?:第\s*(\d+)\s*集|EP\s*(\d+))(?:\s*[：:]?\s*.*)?$/i;
const SCENE = /^(\d+)-(\d+)(?:-([A-F]))?\s+\S.*$/;
const INTERACTION = /^(\d+)-(\d+)-互动(?:\s+.*)?$/;
const OPTION = /^(\d+)-(\d+)-([A-F])\s*[：:]\s*(.*)$/;
const JUMP = /\s*(?:→|->)\s*(\d+)-(\d+)-([A-F])\s*$/;
const MERGE = /^[（(]\s*合流\s*(?:→|->)\s*(\d+)-(\d+)\s*[）)]$/;
const CLOSE = /^[（(]\s*闭合\s*[）)]$/;
const ENDING = /^[（(]\s*结局\s*[：:]\s*\S.*[）)]$/;
const EPISODE_END = /^本集结束$/;

interface Scene {
  episode: number;
  index: number;
  branch?: string;
  line: number;
}

/**
 * Checks the interactive-script text format: episode titles, X-Y scene headings, X-Y-互动 markers,
 * X-Y-A/B/C options with explicit jumps, branch closure and "本集结束". Pure and deterministic.
 */
export function validateScriptFormat(text: string): ScriptFormatResult {
  const issues: ScriptFormatIssue[] = [];
  const add = (rule: string, message: string, lineNumber: number) => issues.push({ rule, message, lineNumber });
  const stats = { episodes: 0, scenes: 0, branchScenes: 0, interactions: 0, options: 0 };
  if (typeof text !== 'string' || !text.trim()) {
    add('结构', '剧本为空，无法校验。', -1);
    return { valid: false, issues, stats };
  }

  const lines = text
    .split(/\r?\n/)
    .map((raw, i) => ({ text: raw.trim(), line: i + 1 }))
    .filter(l => l.text);

  const scenes = new Map<string, Scene>();
  const targets: { id: string; line: number; from: string }[] = [];
  const merges: { episode: number; index: number; line: number }[] = [];
  let episode: number | undefined;
  let episodeEnded = true;
  let lastMain = 0;
  let current: Scene | undefined;
  let currentClosed = true;
  let interaction: { id: string; scene: Scene; options: string[]; line: number } | undefined;
  let interactionSeen = new Set<string>();

  const closeInteraction = () => {
    if (!interaction) return;
    const n = interaction.options.length;
    if (n === 0) add('互动选项', `互动 ${interaction.id} 之后没有选项。`, interaction.line);
    else if (n < 2) add('互动选项', `互动 ${interaction.id} 只有 ${n} 个选项，至少需要 2 个。`, interaction.line);
    interaction = undefined;
  };
  const closeScene = () => {
    if (current?.branch && !currentClosed)
      add('分支收束', `分支场景 ${current.episode}-${current.index}-${current.branch} 没有以「（合流 → 场景编号）」「（闭合）」或「（结局：名称）」收束。`, current.line);
  };
  const closeEpisode = (line: number) => {
    closeInteraction();
    closeScene();
    current = undefined;
    if (episode !== undefined && !episodeEnded) add('集结束', `第 ${episode} 集没有以「本集结束」收尾。`, line);
  };

  for (const { text: t, line } of lines) {
    const ep = t.match(EPISODE);
    if (ep && !SCENE.test(t)) {
      closeEpisode(line);
      episode = Number(ep[1] ?? ep[2]);
      stats.episodes++;
      episodeEnded = false;
      lastMain = 0;
      interactionSeen = new Set();
      continue;
    }
    if (episode === undefined) {
      add('集标题', '剧本必须先出现集标题，例如「第1集 标题」。', line);
      episode = 0;
      episodeEnded = false;
    }
    if (EPISODE_END.test(t)) {
      closeInteraction();
      closeScene();
      current = undefined;
      episodeEnded = true;
      continue;
    }
    const inter = t.match(INTERACTION);
    if (inter) {
      closeInteraction();
      const id = `${inter[1]}-${inter[2]}`;
      stats.interactions++;
      if (!current || `${current.episode}-${current.index}` !== id) {
        add('互动标记', `互动标记 ${id}-互动 必须紧跟在场景 ${id} 的内容之后。`, line);
      }
      if (interactionSeen.has(id)) add('互动标记', `场景 ${id} 出现了多个互动标记。`, line);
      interactionSeen.add(id);
      if (current) interaction = { id, scene: current, options: [], line };
      continue;
    }
    const opt = t.match(OPTION);
    if (opt) {
      stats.options++;
      const id = `${opt[1]}-${opt[2]}`;
      if (!interaction) {
        add('互动选项', `选项 ${id}-${opt[3]} 不在任何互动标记之后。`, line);
        continue;
      }
      if (id !== interaction.id) add('互动选项', `选项 ${id}-${opt[3]} 与它所属的互动 ${interaction.id}-互动 编号不一致。`, line);
      const expected = String.fromCharCode(65 + interaction.options.length);
      if (opt[3] !== expected) add('互动选项', `选项字母应从 A 连续排列，这里应为 ${expected}，实际是 ${opt[3]}。`, line);
      interaction.options.push(opt[3]);
      if (interaction.options.length > 6) add('互动选项', `互动 ${interaction.id} 超过 6 个选项。`, line);
      const jump = opt[4].match(JUMP);
      if (!jump) add('选项跳转', `选项 ${id}-${opt[3]} 没有写明跳转，请用「→ 续场编号」，例如「→ ${opt[1]}-${Number(opt[2]) + 1}-${opt[3]}」。`, line);
      else targets.push({ id: `${jump[1]}-${jump[2]}-${jump[3]}`, line, from: `${id}-${opt[3]}` });
      if (!opt[4].replace(JUMP, '').trim()) add('互动选项', `选项 ${id}-${opt[3]} 缺少选项文字。`, line);
      continue;
    }
    const scene = t.match(SCENE);
    if (scene) {
      closeInteraction();
      closeScene();
      const ep0 = Number(scene[1]);
      const index = Number(scene[2]);
      const branch = scene[3];
      const key = branch ? `${ep0}-${index}-${branch}` : `${ep0}-${index}`;
      if (ep0 !== episode) add('场景编号', `场景 ${key} 的集号应为 ${episode}。`, line);
      if (scenes.has(`${episode}:${key}`)) add('场景编号', `场景编号 ${key} 重复。`, line);
      if (!branch) {
        if (index <= lastMain) add('场景编号', `场景 ${key} 的序号没有递增（上一个主线场景是 ${ep0}-${lastMain}）。`, line);
        lastMain = Math.max(lastMain, index);
      }
      const s: Scene = { episode: ep0, index, ...(branch ? { branch } : {}), line };
      scenes.set(`${episode}:${key}`, s);
      stats.scenes++;
      if (branch) stats.branchScenes++;
      current = s;
      currentClosed = !branch;
      continue;
    }
    const merge = t.match(MERGE);
    if (merge) {
      merges.push({ episode: Number(merge[1]), index: Number(merge[2]), line });
      if (current?.branch) currentClosed = true;
      else add('分支收束', '「（合流 → …）」只能出现在分支场景的末尾。', line);
      continue;
    }
    if (CLOSE.test(t) || ENDING.test(t)) {
      if (current?.branch) currentClosed = true;
      else add('分支收束', '「（闭合）」「（结局：…）」只能出现在分支场景的末尾。', line);
      continue;
    }
    if (/^(?:\d+-\d+)/.test(t) && !/^[△▲]/.test(t)) {
      add('场景编号', `「${t.slice(0, 20)}」看起来像场景头或选项，但格式不对。场景头应为「X-Y 描述」，选项应为「X-Y-A：文字 → 续场编号」。`, line);
    }
  }
  closeEpisode(lines.at(-1)?.line ?? -1);
  if (stats.episodes === 0) add('集标题', '剧本中没有找到集标题，例如「第1集 标题」。', -1);

  for (const target of targets) {
    const [e] = target.id.split('-');
    if (!scenes.has(`${e}:${target.id}`)) add('选项跳转', `选项 ${target.from} 跳转到 ${target.id}，但剧本里没有这个场景。`, target.line);
  }
  const targeted = new Set(targets.map(t => t.id));
  for (const [key, s] of scenes) {
    if (!s.branch) continue;
    const id = key.split(':')[1]!;
    if (!targeted.has(id)) add('场景可达', `分支场景 ${id} 没有任何选项跳转到它，无法到达。`, s.line);
  }
  for (const m of merges) {
    if (!scenes.has(`${m.episode}:${m.episode}-${m.index}`)) add('分支收束', `合流目标 ${m.episode}-${m.index} 在剧本里不存在。`, m.line);
  }

  issues.sort((a, b) => a.lineNumber - b.lineNumber);
  return { valid: issues.length === 0, issues, stats };
}

export function createValidateScriptFormatTool() {
  return createTool({
    id: 'validate_script_format',
    description:
      '校验互动剧本的文本格式：集标题、场景编号 X-Y、互动标记 X-Y-互动、选项 X-Y-A/B/C 及跳转、分支收束、「本集结束」。只检查格式，不评价内容。传入剧本全文，返回问题列表（含行号）。',
    inputSchema: z.object({ script: z.string().min(1).describe('剧本全文') }),
    outputSchema: z.object({
      valid: z.boolean(),
      issues: z.array(z.object({ rule: z.string(), message: z.string(), lineNumber: z.number() })),
      stats: z.object({
        episodes: z.number(),
        scenes: z.number(),
        branchScenes: z.number(),
        interactions: z.number(),
        options: z.number(),
      }),
    }),
    execute: async ({ script }) => validateScriptFormat(script),
  });
}
