import { presentTool } from '@/ds/components/ai/tool-call';
import { toolLabel } from '@/ds/components/ai/tool-call/tool-phrases';
import { canonicalToolName } from '@/ds/components/ai/tool-call/tool-styles';
import { DshAgent } from '@/ds/icons/dsh/DshAgent';
import { DshCode } from '@/ds/icons/dsh/DshCode';
import { DshCommand } from '@/ds/icons/dsh/DshCommand';
import { DshContext } from '@/ds/icons/dsh/DshContext';
import { DshEdit } from '@/ds/icons/dsh/DshEdit';
import { DshGlobe } from '@/ds/icons/dsh/DshGlobe';
import { DshPlan } from '@/ds/icons/dsh/DshPlan';
import { DshQuestion } from '@/ds/icons/dsh/DshQuestion';
import { DshRead } from '@/ds/icons/dsh/DshRead';
import { DshSearch } from '@/ds/icons/dsh/DshSearch';
import { DshSkill } from '@/ds/icons/dsh/DshSkill';
import { DshTool } from '@/ds/icons/dsh/DshTool';
import { t } from '@/lib/i18n';

/** DSH tool summary priority, including streamed JSON and array-valued arguments. */
function processDetail(input: unknown): string | undefined {
  if (typeof input === 'string') {
    try {
      return processDetail(JSON.parse(input));
    } catch {
      return undefined;
    }
  }
  if (!input || typeof input !== 'object') return undefined;
  for (const key of [
    'title',
    'description',
    'objective',
    'task',
    'task_name',
    'name',
    'question',
    'questions',
    'prompt',
    'message',
    'command',
    'cmd',
    'queries',
    'query',
    'pattern',
    'url',
    'uri',
    'file_path',
    'path',
    'target',
    'action',
    'status',
  ]) {
    if (!(key in input)) continue;
    const value: unknown = Reflect.get(input, key);
    const text =
      typeof value === 'string'
        ? value
        : Array.isArray(value) && value.every(item => typeof item === 'string')
          ? value.join(', ')
          : key === 'questions' && Array.isArray(value)
            ? value
                .flatMap(item =>
                  item && typeof item === 'object' && 'question' in item && typeof item.question === 'string'
                    ? [item.question]
                    : [],
                )
                .at(0)
            : undefined;
    if (text?.trim()) {
      const detail = text.replace(/\s+/g, ' ').trim();
      // Paths remain intact in tool arguments. Transcript summaries show the file's name.
      if (['file_path', 'path'].includes(key)) return detail.replace(/\\/g, '/').split('/').filter(Boolean).at(-1);
      return detail;
    }
  }
  return undefined;
}

export function presentProcessTool(toolName: string, input: unknown) {
  const view = presentTool(toolName, input);
  const detail = processDetail(input) ?? view.description ?? view.detail;
  const name = canonicalToolName(toolName);
  const base = { detail, kind: 'tools', icon: DshTool, label: toolLabel(view.label), done: t('Tools called') };
  if (name === 'skill' || name === 'skill_read') return { ...base, icon: DshSkill, label: t('Load skill') };
  switch (view.pose) {
    case 'reading':
    case 'listing':
    case 'fetching':
    case 'output':
      return { ...base, kind: 'read', icon: DshRead, label: t('Read'), done: t('Files read') };
    case 'running':
    case 'stopping':
      return { ...base, kind: 'commands', icon: DshCommand, label: t('Run command'), done: t('Commands executed') };
    case 'searching':
    case 'finding':
    case 'skill-searching':
      return { ...base, kind: 'search', icon: DshSearch, label: t('Search'), done: t('Search completed') };
    case 'editing':
    case 'writing':
    case 'deleting':
    case 'creating':
      return { ...base, kind: 'edit', icon: DshEdit, label: t('Edit'), done: t('Files edited') };
    case 'browsing':
      return { ...base, kind: 'web', icon: DshGlobe, label: t('Search the web'), done: t('Web searched') };
    case 'delegating':
    case 'workflow':
      return { ...base, kind: 'agents', icon: DshAgent, label: t('Delegate'), done: t('Agents dispatched') };
    case 'planning':
      return { ...base, kind: 'plan', icon: DshPlan, label: t('Update plan'), done: t('Plan updated') };
    case 'asking':
      return { ...base, kind: 'questions', icon: DshQuestion, label: t('Ask user'), done: t('Questions asked') };
    case 'inspecting':
      return { ...base, kind: 'code', icon: DshCode, label: t('Run code'), done: t('Code executed') };
    case 'knowledge':
      return { ...base, kind: 'context', icon: DshContext, done: t('Context organized') };
    default:
      return { ...base, label: toolName };
  }
}

const FILE_OPERATIONS = new Set(['read_file', 'read_document', 'write_file', 'edit_file', 'delete_file', 'file_stat']);

export function presentProcessSummary(toolName: string, input: unknown) {
  const presentation = presentProcessTool(toolName, undefined);
  if (!FILE_OPERATIONS.has(canonicalToolName(toolName)) || !input || typeof input !== 'object') {
    return presentation;
  }
  const path = 'path' in input ? input.path : 'file_path' in input ? input.file_path : undefined;
  const detail = typeof path === 'string' ? path.split(/[\\/]/).filter(Boolean).at(-1) : undefined;
  return { ...presentation, detail };
}
