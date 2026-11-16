import type { GetBuiltinMcpServerResponse } from '@mastra/client-js';
import { Badge } from '@mastra/playground-ui/components/Badge';
import type { BadgeVariant } from '@mastra/playground-ui/components/Badge';
import { Button } from '@mastra/playground-ui/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@mastra/playground-ui/components/Card';
import { CodeBlock } from '@mastra/playground-ui/components/CodeBlock';
import { CopyButton } from '@mastra/playground-ui/components/CopyButton';
import { InlineCode } from '@mastra/playground-ui/components/InlineCode';
import { Notice } from '@mastra/playground-ui/components/Notice';
import { Txt } from '@mastra/playground-ui/components/Txt';
import { IconSquareArrowTopRight } from '@mastra/playground-ui/icons/central/IconSquareArrowTopRight';

import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';

import { Trans } from '@mastra/playground-ui/lib/i18n/trans';
import { is401UnauthorizedError, is403ForbiddenError, is404NotFoundError } from '@mastra/playground-ui/utils/errors';
import { useMastraClient } from '@mastra/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useBuiltinMcpServer } from '../../hooks/use-builtin-mcp-server';
import { buildConnectSnippets } from './snippets';

const DOCS_URL = 'https://mastra.ai/docs/server/mcp';

type Descriptor = GetBuiltinMcpServerResponse;
type EnabledDescriptor = Extract<Descriptor, { enabled: true }>;
type DisabledDescriptor = Extract<Descriptor, { enabled: false }>;

/**
 * The built-in server card. Hidden while loading, on 404 (servers that predate the descriptor route) and on
 * 401/403 (callers without `mcp:read`); any other failure shows an error in the card.
 */
export function BuiltinMcpServerSection() {
  useLocale();
  const { data, error } = useBuiltinMcpServer();
  if (data) return <BuiltinMcpServerCard descriptor={data} />;
  if (!error || is401UnauthorizedError(error) || is403ForbiddenError(error) || is404NotFoundError(error)) return null;
  return (
    <BuiltinMcpServerFrame>
      <Notice variant="destructive">{studioT("Couldn't load the built-in MCP server. Try reloading the page.")}</Notice>
    </BuiltinMcpServerFrame>
  );
}

export function BuiltinMcpServerCard({ descriptor }: { descriptor: Descriptor }) {
  return (
    <BuiltinMcpServerFrame status={<StatusBadge descriptor={descriptor} />}>
      {!descriptor.enabled ? (
        <DisabledContent descriptor={descriptor} />
      ) : !descriptor.mcpPackageInstalled ? (
        <MissingPackageContent />
      ) : (
        <EnabledContent descriptor={descriptor} />
      )}
    </BuiltinMcpServerFrame>
  );
}

function BuiltinMcpServerFrame({ status, children }: { status?: ReactNode; children: ReactNode }) {
  useLocale();
  return (
    <Card role="region" aria-label={studioT('Mastra (built-in) MCP server')}>
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0 border-b border-border">
        <CardTitle className="shrink-0">{studioT('Mastra (built-in)')}</CardTitle>
        {status}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function StatusBadge({ descriptor }: { descriptor: Descriptor }) {
  const { label, variant } = statusOf(descriptor);
  return (
    <Badge variant={variant} emphasis="subtle" indicator="dot">
      {label}
    </Badge>
  );
}

function statusOf(descriptor: Descriptor): { label: string; variant: BadgeVariant } {
  if (!descriptor.enabled)
    return {
      get label() {
        return studioT('Disabled');
      },
      variant: 'neutral',
    };
  if (!descriptor.mcpPackageInstalled)
    return {
      get label() {
        return studioT('Not installed');
      },
      variant: 'warning',
    };
  const { auth } = descriptor;
  if (auth.type === 'protected') {
    return { label: studioT('Protected by {value0}', { value0: auth.provider ?? 'server auth' }), variant: 'success' };
  }
  return auth.devOnly
    ? {
        get label() {
          return studioT('Open in dev only');
        },
        variant: 'info',
      }
    : {
        get label() {
          return studioT('Open to anyone');
        },
        variant: 'warning',
      };
}

function DisabledContent({ descriptor }: { descriptor: DisabledDescriptor }) {
  useLocale();
  return (
    <>
      <Txt tone="muted">
        {descriptor.disabledReason === 'config' ? (
          <Trans
            id="The built-in MCP server is turned off because {setting} is {value}."
            values={{ setting: <InlineCode>server.mcp.enabled</InlineCode>, value: <InlineCode>false</InlineCode> }}
          />
        ) : (
          <Trans
            id="The built-in MCP server only runs under {command} unless the server has auth. Configure {auth}, or set {setting} to {value}."
            values={{
              command: <InlineCode>mastra dev</InlineCode>,
              auth: <InlineCode>server.auth</InlineCode>,
              setting: <InlineCode>server.mcp.enabled</InlineCode>,
              value: <InlineCode>true</InlineCode>,
            }}
          />
        )}
      </Txt>
      <DocsLink />
    </>
  );
}

function MissingPackageContent() {
  useLocale();
  return (
    <>
      <Txt tone="muted">
        <Trans
          id="The built-in MCP server is enabled, but it needs the {part0} package. Install it and restart the server."
          values={{ part0: <InlineCode>@mastra/mcp</InlineCode> }}
        />
      </Txt>
      <CodeBlock code="npm install @mastra/mcp" lang="bash" copyTooltip="Copy install command" />
      <DocsLink />
    </>
  );
}

function EnabledContent({ descriptor }: { descriptor: EnabledDescriptor }) {
  useLocale();
  const client = useMastraClient();
  // The client drops a trailing slash from baseUrl for its own requests; do the same for the copied URL.
  const origin = (client.options.baseUrl || window.location.origin).replace(/\/$/, '');
  const url = `${origin}${descriptor.path}`;
  const snippets = buildConnectSnippets(url, { protectedServer: descriptor.auth.type === 'protected' });
  const [active, setActive] = useState(snippets[0].value);
  const activeSnippet = snippets.find(snippet => snippet.value === active) ?? snippets[0];

  return (
    <>
      <div className="flex flex-col gap-2">
        <Txt as="span" variant="label" tone="muted">
          {studioT('Endpoint')}
        </Txt>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted py-2 pr-2 pl-3">
          <Txt as="span" font="mono" className="min-w-0 break-all">
            {url}
          </Txt>
          <CopyButton tooltip={studioT('Copy MCP endpoint URL')} content={url} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Txt as="span" variant="label" tone="muted">
          {studioT('Toolsets')}
        </Txt>
        <ul className="flex flex-wrap gap-2" aria-label={studioT('Toolsets')}>
          {descriptor.toolsets.map(toolset => (
            <li key={toolset}>
              <Badge variant="neutral" emphasis="subtle">
                {toolsetLabel(toolset)}
              </Badge>
            </li>
          ))}
          {descriptor.readOnly && (
            <li>
              <Badge variant="info" emphasis="subtle">
                {studioT('Read-only')}
              </Badge>
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Txt as="span" variant="label" tone="muted">
          {studioT('Connect a client')}
        </Txt>
        <CodeBlock
          code={activeSnippet.code}
          lang={activeSnippet.lang}
          options={snippets.map(({ value, label }) => ({ value, label }))}
          value={active}
          onValueChange={setActive}
          selector="tabs"
          copyTooltip={studioT('Copy')}
        />
        <Txt variant="body-sm" tone="muted">
          {studioT('Tools are listed per caller, so connect a client to see the tools your token can use.')}
        </Txt>
      </div>
    </>
  );
}

function toolsetLabel(toolset: string) {
  switch (toolset) {
    case 'agents':
      return studioT('Agents');
    case 'workflows':
      return studioT('Workflows');
    case 'tools':
      return studioT('Tools');
    case 'memory':
      return studioT('Memory');
    case 'observability':
      return studioT('Observability');
    case 'observability_analytics':
      return studioT('Observability analytics');
    case 'stored_agents':
      return studioT('Stored agents');
  }
  const words = toolset.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function DocsLink() {
  useLocale();
  return (
    <div>
      <Button
        variant="ghost"
        render={<a href={DOCS_URL} target="_blank" rel="noopener noreferrer" />}
        icon={<IconSquareArrowTopRight />}
      >
        {studioT('MCP server docs')}
      </Button>
    </div>
  );
}
