import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { MessageKey } from './runtime';
import { useTranslation } from './index';

/** Translate a whole sentence while retaining links, emphasis, and dynamic values as React nodes. */
export function Trans({ id, values }: { id: MessageKey; values: Readonly<Record<string, ReactNode>> }) {
  const { t } = useTranslation();
  return t(id)
    .split(/(\{\w+\})/g)
    .map((part, index) => {
      const name = part.startsWith('{') && part.endsWith('}') ? part.slice(1, -1) : undefined;
      return <Fragment key={index}>{name !== undefined && Object.hasOwn(values, name) ? values[name] : part}</Fragment>;
    });
}
