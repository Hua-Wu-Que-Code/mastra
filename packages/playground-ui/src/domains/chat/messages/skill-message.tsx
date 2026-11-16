import type { SkillActivation } from './skill-activation';
import { agentGlyph } from '@/ds/components/AgentIndicator';
import { ActivityItem, SignalActivity } from '@/ds/components/ai/activity';
import type { ActivityAppearance } from '@/ds/components/ai/activity';
import { MarkdownRenderer } from '@/ds/components/MarkdownRenderer';
import { ScrollArea } from '@/ds/components/ScrollArea';
import { t as studioT, useLocale } from '@/lib/i18n';

const SkillGlyph = agentGlyph('skill');

export function SkillMessage({
  activation,
  defaultOpen,
  appearance = 'row',
}: {
  activation: SkillActivation;
  defaultOpen?: boolean;
  appearance?: ActivityAppearance;
}) {
  useLocale();
  const { name, arguments: args, instructions, description } = activation;
  const item = (
    <ActivityItem
      appearance={appearance}
      label={studioT('Skill')}
      detail={args ? `${name} ${args}` : name}
      icon={<SkillGlyph className={appearance === 'inline' ? undefined : 'text-span-skill'} aria-hidden />}
      data-skill-name={name}
      aria-label={studioT('Skill: {value0}', { value0: name })}
      defaultOpen={defaultOpen}
    >
      <ScrollArea maxHeight="24rem" revealScrollbarOnHover={false}>
        <MarkdownRenderer className="text-caption">{instructions}</MarkdownRenderer>
      </ScrollArea>
    </ActivityItem>
  );

  if (description === undefined) return item;

  return (
    <div className="flex flex-col">
      {item}
      <SignalActivity
        kind="reactive"
        label={studioT('Work item description')}
        message={description}
        appearance={appearance}
      />
    </div>
  );
}
