import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import type { ReactNode } from 'react';
import { ToolSchemaSection } from './tool-drawer/tool-schema-section';

export interface ToolOverviewProps {
  inputSchema: unknown;
  outputSchema?: unknown;
  requestContextSchema?: unknown;
  /** Trailing section, e.g. the agents that use this tool. */
  footer?: ReactNode;
}

export function ToolOverview({ inputSchema, outputSchema, requestContextSchema, footer }: ToolOverviewProps) {
  useLocale();
  return (
    <div className="grid gap-6">
      <ToolSchemaSection
        title={studioT('Input')}
        schema={inputSchema}
        emptyMessage={studioT('This tool takes no input.')}
        defaultsAreOptional
      />
      <ToolSchemaSection
        title={studioT('Output')}
        schema={outputSchema}
        emptyMessage={studioT('No output schema defined.')}
      />
      {requestContextSchema !== undefined && (
        <ToolSchemaSection
          title={studioT('Request context')}
          schema={requestContextSchema}
          emptyMessage={studioT('No request context fields.')}
          defaultsAreOptional
        />
      )}
      {footer}
    </div>
  );
}
