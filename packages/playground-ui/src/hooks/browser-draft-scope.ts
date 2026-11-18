import { createContext } from 'react';

/** Debug form drafts are local, but must not be reused by another account or server. */
export const BrowserDraftScopeContext = createContext<string | undefined>(undefined);
export const scopedDraftKey = (key: string, scope?: string) => (scope ? JSON.stringify([scope, key]) : key);
