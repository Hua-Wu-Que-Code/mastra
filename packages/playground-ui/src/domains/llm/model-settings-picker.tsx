import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ModelPickerPanel } from './model-picker-panel';
import type { ModelPickerProvider, ModelPickerValue } from './model-picker-types';
import { Button } from '@/ds/components/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ds/components/Popover';
import { IconArrowLeft } from '@/ds/icons/central/IconArrowLeft';
import { IconCheckmark2Medium } from '@/ds/icons/central/IconCheckmark2Medium';
import { IconChevronDownMedium } from '@/ds/icons/central/IconChevronDownMedium';
import { IconChevronRightMedium } from '@/ds/icons/central/IconChevronRightMedium';
import { t, useLocale } from '@/lib/i18n';
import { formatModelName } from '@/utils/model';

export interface ModelSettingsPickerProps {
  providers: ModelPickerProvider[];
  value?: ModelPickerValue;
  onValueChange: (value: ModelPickerValue) => void;
  defaultModel?: ModelPickerValue;
  reset?: { label: string; onClick: () => void };
  reasoning?: { levels: string[]; value: string; onChange: (level: string) => void };
}

const noProviderIcon = () => undefined;
const levelName = (level: string) => {
  switch (level) {
    case 'off':
      return t('Off');
    case 'low':
      return t('Low');
    case 'medium':
      return t('Medium');
    case 'high':
      return t('High');
    case 'minimal':
      return t('Minimal');
    case 'xhigh':
      return t('Extra high');
    default:
      return level;
  }
};

// Native buttons keep Enter/Space and Tab behavior; arrows also move through each pane.
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const current = buttons.findIndex(button => button === document.activeElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[next]?.focus();
}

function focusPane(element: HTMLDivElement | null) {
  element?.querySelector<HTMLElement>('input, button')?.focus();
}

/** Click through model and reasoning panes, with no provider marks or hover menus. */
export function ModelSettingsPicker({
  providers,
  value,
  onValueChange,
  defaultModel,
  reset,
  reasoning,
}: ModelSettingsPickerProps) {
  useLocale();
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<'root' | 'model' | 'reasoning'>('root');
  const selected = providers
    .find(provider => provider.id === value?.provider)
    ?.models.find(model => model.id === value?.model);
  const name = selected?.name ?? (value?.model ? formatModelName(value.model) : t('Select model'));
  const close = () => setOpen(false);
  const rowClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-label hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden';

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setPane('root');
      }}
    >
      <PopoverTrigger
        variant="ghost"
        size="sm"
        className="max-w-64 min-w-0 gap-1.5"
        aria-label={`${t('Model:')} ${name}${reasoning ? ` ${levelName(reasoning.value)}` : ''}`}
      >
        <span className="truncate">{name}</span>
        {reasoning && <span className="shrink-0 text-muted-foreground">{levelName(reasoning.value)}</span>}
        <IconChevronDownMedium aria-hidden className="size-icon-xs shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-1.5"
        aria-label={t('Model and reasoning level')}
      >
        {pane === 'root' ? (
          <div key="root" ref={focusPane} onKeyDown={moveFocus}>
            <button
              type="button"
              className={rowClass}
              aria-label={`${t('Model')} ${name}`}
              onClick={() => setPane('model')}
            >
              <span>{t('Model')}</span>
              <span className="ml-auto truncate text-muted-foreground">{name}</span>
              <IconChevronRightMedium aria-hidden className="size-icon-sm shrink-0" />
            </button>
            {reasoning && (
              <button type="button" className={rowClass} onClick={() => setPane('reasoning')}>
                <span>{t('Reasoning level')}</span>
                <span className="ml-auto text-muted-foreground">{levelName(reasoning.value)}</span>
                <IconChevronRightMedium aria-hidden className="size-icon-sm shrink-0" />
              </button>
            )}
          </div>
        ) : (
          <div key={pane} ref={focusPane}>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 w-full justify-start"
              onClick={() => setPane('root')}
              aria-label={t('Back to model settings')}
            >
              <IconArrowLeft aria-hidden />
              {pane === 'model' ? t('Model') : t('Reasoning level')}
            </Button>
            {pane === 'model' ? (
              <ModelPickerPanel
                providers={providers}
                value={value}
                defaultModel={defaultModel}
                onSelect={next => {
                  onValueChange(next);
                  close();
                }}
                renderProviderIcon={noProviderIcon}
                reset={
                  reset && {
                    label: reset.label,
                    onClick: () => {
                      reset.onClick();
                      close();
                    },
                  }
                }
                sheet={false}
                preserveOrder
                onAddProvider={close}
              />
            ) : (
              reasoning && (
                <div role="listbox" aria-label={t('Reasoning level')} onKeyDown={moveFocus}>
                  {reasoning.levels.map(level => (
                    <button
                      key={level}
                      type="button"
                      role="option"
                      aria-selected={level === reasoning.value}
                      className={rowClass}
                      onClick={() => {
                        reasoning.onChange(level);
                        close();
                      }}
                    >
                      <span>{levelName(level)}</span>
                      {level === reasoning.value && <IconCheckmark2Medium aria-hidden className="ml-auto" />}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
