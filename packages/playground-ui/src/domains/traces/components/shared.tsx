import type { UISpanStyle } from '../types';
import { AgentIcon } from '@/ds/icons/AgentIcon';
import { IconBrain } from '@/ds/icons/central/IconBrain';
import { McpServerIcon } from '@/ds/icons/McpServerIcon';
import { MemoryIcon } from '@/ds/icons/MemoryIcon';
import { ScorersIcon } from '@/ds/icons/ScorersIcon';
import { SkillIcon } from '@/ds/icons/SkillIcon';
import { ToolsIcon } from '@/ds/icons/ToolsIcon';
import { WorkflowIcon } from '@/ds/icons/WorkflowIcon';
import { WorkspacesIcon } from '@/ds/icons/WorkspacesIcon';
import { t as studioT } from '@/lib/i18n';

export const spanTypePrefixes = [
  'agent',
  'workflow',
  'model',
  'mcp',
  'tool',
  'provider',
  'memory',
  'workspace',
  'skill',
  'scorer',
  'other',
];

const spanTypeToUiElements: Record<string, UISpanStyle> = {
  agent: {
    icon: <AgentIcon />,
    color: 'var(--span-agent)',
    get label() {
      return studioT('Agent');
    },
    typePrefix: 'agent',
  },
  workflow: {
    icon: <WorkflowIcon />,
    color: 'var(--span-workflow)',
    get label() {
      return studioT('Workflow');
    },
    typePrefix: 'workflow',
  },
  model: {
    icon: <IconBrain />,
    color: 'var(--span-model)',
    get label() {
      return studioT('Model');
    },
    typePrefix: 'model',
  },
  mcp: {
    icon: <McpServerIcon />,
    color: 'var(--span-mcp)',
    label: 'MCP',
    typePrefix: 'mcp',
  },
  tool: {
    icon: <ToolsIcon />,
    color: 'var(--span-tool)',
    get label() {
      return studioT('Tool');
    },
    typePrefix: 'tool',
  },
  provider: {
    icon: <ToolsIcon />,
    color: 'var(--span-provider)',
    get label() {
      return studioT('Provider Tool');
    },
    typePrefix: 'provider',
  },
  memory: {
    icon: <MemoryIcon />,
    color: 'var(--span-memory)',
    get label() {
      return studioT('Memory');
    },
    typePrefix: 'memory',
  },
  workspace: {
    icon: <WorkspacesIcon />,
    color: 'var(--span-workspace)',
    get label() {
      return studioT('Workspace');
    },
    typePrefix: 'workspace',
  },
  skill: {
    icon: <SkillIcon />,
    color: 'var(--span-skill)',
    get label() {
      return studioT('Skill');
    },
    typePrefix: 'skill',
  },
  scorer: {
    icon: <ScorersIcon />,
    color: 'var(--span-scorer)',
    get label() {
      return studioT('Scorer');
    },
    typePrefix: 'scorer',
  },
};

const otherSpanType: UISpanStyle = {
  color: 'var(--span-other)',
  get label() {
    return studioT('Other');
  },
  typePrefix: 'other',
};

export function getSpanTypeUi(type: string) {
  const typePrefix = type?.toLowerCase().split('_')[0] ?? '';
  return spanTypeToUiElements[typePrefix] ?? otherSpanType;
}
