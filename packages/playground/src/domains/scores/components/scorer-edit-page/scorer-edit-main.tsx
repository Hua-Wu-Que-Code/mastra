import { CodeEditor } from '@mastra/playground-ui/components/CodeEditor';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { ScorerFormValues } from './utils/form-validation';
import { SectionHeader } from '@/domains/cms';

interface ScorerEditMainProps {
  form: UseFormReturn<ScorerFormValues>;
}

export function ScorerEditMain({ form }: ScorerEditMainProps) {
  useLocale();
  const { control } = form;

  return (
    <div className="flex h-full flex-col gap-3 px-4">
      <SectionHeader title={studioT('Instructions')} subtitle={studioT("Write your scorer's system prompt.")} />
      <Controller
        name="instructions"
        control={control}
        render={({ field }) => (
          <div className="flex flex-1 flex-col">
            <CodeEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              language="markdown"
              showCopyButton={false}
              placeholder={studioT('Enter scorer instructions')}
              className="min-h-[200px] flex-1"
            />
          </div>
        )}
      />
    </div>
  );
}
