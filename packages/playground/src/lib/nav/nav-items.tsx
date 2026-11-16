import { AgentIcon } from '@mastra/playground-ui/icons/AgentIcon';
import { IconClipboard2 } from '@mastra/playground-ui/icons/central/IconClipboard2';
import { IconLayoutGrid1 } from '@mastra/playground-ui/icons/central/IconLayoutGrid1';
import { IconLibrary } from '@mastra/playground-ui/icons/central/IconLibrary';
import { DatasetsIcon } from '@mastra/playground-ui/icons/DatasetsIcon';
import { ExperimentsIcon } from '@mastra/playground-ui/icons/ExperimentsIcon';
import { LogsIcon } from '@mastra/playground-ui/icons/LogsIcon';
import { McpServerIcon } from '@mastra/playground-ui/icons/McpServerIcon';
import { MetricsIcon } from '@mastra/playground-ui/icons/MetricsIcon';
import { ProcessorIcon } from '@mastra/playground-ui/icons/ProcessorIcon';
import { PromptIcon } from '@mastra/playground-ui/icons/PromptIcon';
import { ScorersIcon } from '@mastra/playground-ui/icons/ScorersIcon';
import { SettingsIcon } from '@mastra/playground-ui/icons/SettingsIcon';
import { ToolsIcon } from '@mastra/playground-ui/icons/ToolsIcon';
import { TraceIcon } from '@mastra/playground-ui/icons/TraceIcon';
import { WorkflowIcon } from '@mastra/playground-ui/icons/WorkflowIcon';
import { WorkspacesIcon } from '@mastra/playground-ui/icons/WorkspacesIcon';

import { t as studioT } from '@mastra/playground-ui/lib/i18n';
import { CableIcon } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  name: string;
  url: string;
  Icon: NavIcon;
  isOnMastraPlatform?: boolean;
  activePaths?: string[];
  hidden?: boolean;
  foldable?: boolean;
}

export interface NavSection {
  key: string;
  title: string;
  href?: string;
  items: NavItem[];
}

const isSignalsEnabled = typeof window !== 'undefined' && window.MASTRA_SIGNALS_UI === 'true';

const signalsNavItem: NavItem = {
  get name() {
    return studioT('Intelligence');
  },
  url: '/intelligence',
  activePaths: ['/intelligence'],
  Icon: IconLayoutGrid1,
  isOnMastraPlatform: true,
  hidden: !isSignalsEnabled,
};

export const mainNav: NavSection[] = [
  {
    key: 'primitives',
    get title() {
      return studioT('Primitives');
    },
    items: [
      {
        get name() {
          return studioT('Agents');
        },
        url: '/agents',
        Icon: AgentIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Prompts');
        },
        url: '/prompts',
        Icon: PromptIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Workflows');
        },
        url: '/workflows',
        Icon: WorkflowIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Processors');
        },
        url: '/processors',
        Icon: ProcessorIcon,
        isOnMastraPlatform: false,
        foldable: true,
      },
      {
        get name() {
          return studioT('MCP Servers');
        },
        url: '/mcps',
        Icon: McpServerIcon,
        isOnMastraPlatform: true,
        foldable: true,
      },
      {
        get name() {
          return studioT('Tools');
        },
        url: '/tools',
        Icon: ToolsIcon,
        isOnMastraPlatform: true,
        foldable: true,
      },
      {
        get name() {
          return studioT('Connections');
        },
        url: '/connections',
        Icon: CableIcon,
        isOnMastraPlatform: false,
        foldable: true,
      },
      {
        get name() {
          return studioT('Workspaces');
        },
        url: '/workspaces',
        Icon: WorkspacesIcon,
        isOnMastraPlatform: true,
        foldable: true,
      },
      {
        get name() {
          return studioT('Knowledge');
        },
        url: '/knowledge',
        Icon: IconLibrary,
        isOnMastraPlatform: false,
      },
    ],
  },
  {
    key: 'evaluation',
    get title() {
      return studioT('Evaluation');
    },
    items: [
      {
        get name() {
          return studioT('Scorers');
        },
        url: '/scorers',
        Icon: ScorersIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Datasets');
        },
        url: '/datasets',
        Icon: DatasetsIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Experiments');
        },
        url: '/experiments',
        Icon: ExperimentsIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Review Queue');
        },
        url: '/experiments/review-queue',
        Icon: IconClipboard2,
        isOnMastraPlatform: true,
      },
    ],
  },
  {
    key: 'observability',
    get title() {
      return studioT('Observability');
    },
    items: [
      {
        get name() {
          return studioT('Metrics');
        },
        url: '/metrics',
        Icon: MetricsIcon,
        isOnMastraPlatform: true,
      },
      {
        get name() {
          return studioT('Traces');
        },
        url: '/traces',
        Icon: TraceIcon,
        isOnMastraPlatform: true,
        // /spans is reached through the Traces/Spans switch on the traces page.
        activePaths: ['/spans', '/threads'],
      },
      signalsNavItem,
      {
        get name() {
          return studioT('Logs');
        },
        url: '/logs',
        Icon: LogsIcon,
        isOnMastraPlatform: true,
      },
    ],
  },
];

export const bottomNav: NavItem[] = [
  {
    get name() {
      return studioT('Settings');
    },
    url: '/settings',
    Icon: SettingsIcon,
    isOnMastraPlatform: false,
  },
];

const allItems: NavItem[] = [...mainNav.flatMap(s => s.items), ...bottomNav];

export function findNavItem(url: string): NavItem | undefined {
  return allItems.find(i => i.url === url);
}
