import { posix } from 'node:path';
import type { UserStorage } from './user-storage.ts';

type Part = {
  type?: string;
  text?: string;
  filename?: string;
  mimeType?: string;
  mime?: string;
  url?: string;
  data?: string;
};
/** Restore original attachment bytes without rewriting conversation history. */
export async function restoreLegacyAttachments(store: UserStorage, owner: string, messageId: string, parts: Part[]) {
  if (!/^[a-zA-Z0-9_-]+$/.test(messageId)) throw new Error('Invalid persisted message ID');
  let restored = 0;
  for (const [index, part] of parts.entries()) {
    let name: string | undefined, data: Buffer | undefined, mime: string | undefined;
    if (part.type === 'text') {
      const match = part.text?.match(/^<attachment name="([^"]*)">([\s\S]*)<\/attachment>$/);
      if (!match || match[2].startsWith('文件已保存到当前用户工作区：')) continue;
      name = match[1]
        .replaceAll('&quot;', '"')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&');
      data = Buffer.from(match[2]);
      mime = 'text/plain';
    } else if (part.type === 'file') {
      // Only inline bytes are recoverable. Never fetch URLs from old model input.
      const match = (part.url ?? part.data)?.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/);
      if (!match) continue;
      mime = match[1];
      name = part.filename ?? `attachment-${index}`;
      data = Buffer.from(match[2], 'base64');
    }
    if (!name || !data) continue;
    name = posix.basename(name.replaceAll('\\', '/')).replace(/[\x00-\x1f]/g, '_');
    if (!name || name === '.' || name === '..') continue;
    await store.write(owner, `/uploads/legacy-${messageId}-${index}/${name}`, data, {
      source: 'upload',
      mimeType: mime,
      overwrite: false,
    });
    restored++;
  }
  return restored;
}
