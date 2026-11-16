import { t as studioT } from '@mastra/playground-ui/lib/i18n';

export const TOKEN_PLACEHOLDER = '<your-token>';

export interface ConnectSnippet {
  value: string;
  label: string;
  lang: string;
  code: string;
}

/** Quotes `value` as one POSIX shell argument, so a configured path can't split or inject into the command. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Copy-paste client configs for the built-in server. Never embeds a real credential, only a placeholder. */
export function buildConnectSnippets(url: string, { protectedServer }: { protectedServer: boolean }): ConnectSnippet[] {
  const shellUrl = shellQuote(url);
  const authHeader = `Authorization: Bearer ${TOKEN_PLACEHOLDER}`;
  const headers = protectedServer ? { headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } } : {};

  return [
    {
      value: 'claude-code',
      get label() {
        return studioT('Claude Code');
      },
      lang: 'bash',
      code: `claude mcp add --transport http mastra ${shellUrl}${protectedServer ? ` --header "${authHeader}"` : ''}`,
    },
    {
      value: 'cursor',
      get label() {
        return 'Cursor';
      },
      lang: 'json',
      code: JSON.stringify({ mcpServers: { mastra: { url, ...headers } } }, null, 2),
    },
    {
      value: 'vscode',
      get label() {
        return studioT('VS Code');
      },
      lang: 'json',
      code: JSON.stringify({ servers: { mastra: { type: 'http', url, ...headers } } }, null, 2),
    },
    {
      value: 'inspector',
      get label() {
        return studioT('MCP Inspector');
      },
      lang: 'bash',
      code: `npx @modelcontextprotocol/inspector --cli ${shellUrl} --transport http${protectedServer ? ` --header "${authHeader}"` : ''} --method tools/list`,
    },
  ];
}
