import { IconChatBubbles } from '@mastra/playground-ui/icons/central/IconChatBubbles';
import { IconGraduateCap } from '@mastra/playground-ui/icons/central/IconGraduateCap';
import { IconMaintenance } from '@mastra/playground-ui/icons/central/IconMaintenance';
import { IconQuestionmarkCircle } from '@mastra/playground-ui/icons/central/IconQuestionmarkCircle';
import { t as studioT } from '@mastra/playground-ui/lib/i18n';

export const FALLBACK_MODEL = { provider: 'google', name: 'gemini-2.5-flash' } as const;

export const EXAMPLES = [
  {
    get title() {
      return studioT('Support triage');
    },
    icon: IconChatBubbles,
    prompt:
      'Build an agent that triages incoming customer support emails. Classify urgency, route to the right team, and draft a polite first reply that asks for missing details.',
  },
  {
    get title() {
      return studioT('Standup bot');
    },
    icon: IconQuestionmarkCircle,
    prompt:
      'Build an agent that runs an async Slack standup. It pings each team member in the morning, collects what they did, what they will do, and any blockers, then posts a concise summary in #standup.',
  },
  {
    get title() {
      return studioT('PR reviewer');
    },
    icon: IconMaintenance,
    prompt:
      'Build an agent that reviews TypeScript pull requests on GitHub. Look for type-safety issues, missing tests, and inconsistent patterns. Leave inline review comments with concrete suggestions.',
  },
  {
    get title() {
      return studioT('Onboarding tutor');
    },
    icon: IconGraduateCap,
    prompt:
      'Build an agent that onboards new engineers to our codebase. It explains the architecture, points to the right docs, and answers questions in plain English with code examples.',
  },
];
