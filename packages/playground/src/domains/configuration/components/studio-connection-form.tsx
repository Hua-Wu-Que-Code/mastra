import { Button } from '@mastra/playground-ui/components/Button';
import { Input } from '@mastra/playground-ui/components/Input';
import { IconPlusMedium } from '@mastra/playground-ui/icons/central/IconPlusMedium';
import { TrashIcon } from '@mastra/playground-ui/icons/TrashIcon';
import { t as studioT, useLocale } from '@mastra/playground-ui/lib/i18n';
import {
  SettingsContainer,
  SettingsEmptyRow,
  SettingsListHeader,
  SettingsRow,
} from '@mastra/playground-ui/new/settings';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useStudioConfig } from '../context/studio-config-state';
import type { StudioConfig } from '../types';

interface HeaderRow {
  id: number;
  name: string;
  value: string;
}

interface ConnectionDraft {
  baseUrl: string;
  apiPrefix: string;
  headers: HeaderRow[];
}

function headersRecord(rows: HeaderRow[]) {
  return Object.fromEntries(rows.filter(row => row.name.trim()).map(row => [row.name.trim(), row.value]));
}

function matchesConfig(draft: ConnectionDraft, config: StudioConfig) {
  return (
    draft.baseUrl.trim() === config.baseUrl.trim() &&
    draft.apiPrefix.trim() === (config.apiPrefix ?? '').trim() &&
    JSON.stringify(headersRecord(draft.headers)) === JSON.stringify(config.headers)
  );
}

/**
 * The URL, API prefix and headers only work as a set (a new instance often needs its own prefix and auth header), so
 * edits stay a draft until "Save changes" applies them together: Studio switches once, from one working connection
 * to the next. Saving changes the stored config, which remounts the form (it's keyed by it) on the saved values.
 */
export function StudioConnectionForm({ initialConfig }: { initialConfig: StudioConfig }) {
  useLocale();
  const { setConfig } = useStudioConfig();
  // Rows keep an id so removing one doesn't hand its inputs to the next. A counter, not `crypto.randomUUID`,
  // which is missing when Studio is served over plain http.
  const nextId = useRef(0);
  const draftFromConfig = (): ConnectionDraft => ({
    baseUrl: initialConfig.baseUrl,
    apiPrefix: initialConfig.apiPrefix ?? '',
    headers: Object.entries(initialConfig.headers).map(([name, value]) => ({ id: nextId.current++, name, value })),
  });
  const [draft, setDraft] = useState(draftFromConfig);
  const [urlError, setUrlError] = useState<string>();
  const changed = !matchesConfig(draft, initialConfig);
  const addHeader = (
    <Button
      type="button"
      size="sm"
      icon={<IconPlusMedium />}
      onClick={() =>
        setDraft(current => ({
          ...current,
          headers: [...current.headers, { id: nextId.current++, name: '', value: '' }],
        }))
      }
    >
      {studioT('Add header')}
    </Button>
  );

  const updateHeader = (id: number, patch: Partial<HeaderRow>) =>
    setDraft(current => ({
      ...current,
      headers: current.headers.map(row => (row.id === id ? { ...row, ...patch } : row)),
    }));

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.baseUrl.trim()) {
      setUrlError(studioT('Enter the server URL'));
      return;
    }
    setConfig({
      baseUrl: draft.baseUrl.trim(),
      apiPrefix: draft.apiPrefix.trim() || undefined,
      headers: headersRecord(draft.headers),
    });
    toast.success(studioT('Connection saved'));
  }

  function discard() {
    setDraft(draftFromConfig());
    setUrlError(undefined);
  }

  return (
    <form onSubmit={save} onReset={discard} noValidate>
      <SettingsContainer>
        <SettingsRow
          label={studioT('Mastra instance URL')}
          description={studioT('The server this studio talks to.')}
          errorMsg={urlError}
        >
          <Input
            name="url"
            value={draft.baseUrl}
            placeholder="http://localhost:4111"
            spellCheck={false}
            onChange={event => {
              setDraft(current => ({ ...current, baseUrl: event.target.value }));
              setUrlError(undefined);
            }}
          />
        </SettingsRow>
        <SettingsRow label={studioT('API prefix')} description={studioT('Path in front of every API route.')}>
          <Input
            name="apiPrefix"
            value={draft.apiPrefix}
            placeholder={studioT('/api (default)')}
            spellCheck={false}
            onChange={event => setDraft(current => ({ ...current, apiPrefix: event.target.value }))}
          />
        </SettingsRow>
        {draft.headers.length === 0 ? (
          <SettingsEmptyRow action={addHeader}>{studioT('No request headers')}</SettingsEmptyRow>
        ) : (
          <SettingsListHeader action={addHeader}>
            {draft.headers.length === 1
              ? studioT('1 request header')
              : studioT('{count} request headers', { count: draft.headers.length })}
          </SettingsListHeader>
        )}
        {draft.headers.map(row => (
          <div key={row.id} className="flex min-w-0 items-center gap-2">
            <Input
              aria-label={studioT('Header name')}
              value={row.name}
              placeholder={studioT('Authorization')}
              spellCheck={false}
              onChange={event => updateHeader(row.id, { name: event.target.value })}
            />
            <Input
              aria-label={row.name ? studioT('Value of {value0}', { value0: row.name }) : studioT('Header value')}
              value={row.value}
              placeholder={studioT('Bearer <token>')}
              spellCheck={false}
              onChange={event => updateHeader(row.id, { value: event.target.value })}
            />
            <Button
              type="button"
              size="icon-md"
              variant="ghost"
              aria-label={row.name ? studioT('Remove {value0}', { value0: row.name }) : studioT('Remove header')}
              tooltip={studioT('Remove header')}
              onClick={() =>
                setDraft(current => ({ ...current, headers: current.headers.filter(other => other.id !== row.id) }))
              }
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        {changed ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-muted-foreground">{studioT('Unsaved changes')}</span>
            <div className="flex items-center gap-2">
              <Button type="reset" size="sm" variant="ghost">
                {studioT('Discard')}
              </Button>
              <Button type="submit" size="sm" variant="primary">
                {studioT('Save changes')}
              </Button>
            </div>
          </div>
        ) : null}
      </SettingsContainer>
    </form>
  );
}
