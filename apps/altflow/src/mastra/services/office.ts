import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { createConverter } from '@deepseek-ai/libreoffice-kit';
import { FileStorageError } from '../user-storage';
import type { UserStorage } from '../user-storage';

export const isOfficeDocument = (path: string) => /\.(docx?|odt|xlsx?|ods|pptx?|odp|pdf)$/i.test(path);

/** Uses DSH's office-kit engine and private-snapshot lifecycle, with its deployment limits.
 * Reference: deepseek-harness/packages/document/office-kit/src/index.ts, runOperation.
 * Storage authorization happens before any native conversion; originals are never changed.
 */
export class OfficeReader {
  private active = 0;
  private queue: Array<() => void> = [];
  constructor(private readonly storage: UserStorage) {}

  async read(owner: string, path: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    if (!isOfficeDocument(path)) throw new FileStorageError('不支持的文档格式');
    const info = await this.storage.info(owner, path);
    if (info.size > 50 * 1024 * 1024) throw new FileStorageError('Office 文档超过 50 MB 读取上限', 413);
    await this.acquire(signal);
    let directory: string | undefined;
    try {
      const bytes = await this.storage.read(owner, path);
      signal?.throwIfAborted();
      if (bytes.length > 50 * 1024 * 1024) throw new FileStorageError('Office 文档超过 50 MB 读取上限', 413);
      directory = await mkdtemp(join(tmpdir(), 'altflow-office-kit-'));
      const extension = extname(path).toLowerCase();
      const inputPath = join(directory, `source${extension}`);
      await writeFile(inputPath, bytes, { flag: 'wx', mode: 0o600, signal });
      // Writer's text export preserves full flowing text without PDF pagination loss.
      const writer = /\.(docx?|odt)$/.test(extension);
      const outputPath = join(directory, writer ? 'body.txt' : 'body.pdf');
      if (extension !== '.pdf') {
        const converter = await createConverter({
          timeoutMs: 60_000,
          maxInputBytes: 50 * 1024 * 1024,
          maxOutputBytes: 100 * 1024 * 1024,
          maxImageResolution: 192,
          maxArchiveEntries: 10_000,
          maxUncompressedBytes: 250 * 1024 * 1024,
        });
        try {
          await converter.convert({ inputPath, outputPath }, signal);
        } finally {
          await converter.dispose();
        }
      }
      if (writer) return (await readFile(outputPath, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loading = getDocument({
        data: new Uint8Array(extension === '.pdf' ? bytes : await readFile(outputPath)),
        useSystemFonts: true,
        isEvalSupported: false,
      });
      const abort = () => {
        void loading.destroy();
      };
      signal?.addEventListener('abort', abort, { once: true });
      try {
        signal?.throwIfAborted();
        const pdf = await loading.promise;
        const pages: string[] = [];
        for (let page = 1; page <= pdf.numPages; page++) {
          signal?.throwIfAborted();
          const content = await (await pdf.getPage(page)).getTextContent();
          pages.push(content.items.map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''));
        }
        const text = pages.join('\n\n');
        if (!text.trim())
          throw new FileStorageError('文档没有可提取的文字。扫描件需要 OCR，不能把空正文当成读取成功。');
        return text;
      } finally {
        signal?.removeEventListener('abort', abort);
        await loading.destroy();
      }
    } finally {
      try {
        if (directory) await rm(directory, { recursive: true, force: true });
      } finally {
        const next = this.queue.shift();
        if (next) next();
        else this.active--;
      }
    }
  }

  private async acquire(signal?: AbortSignal) {
    if (this.active < 2) {
      this.active++;
      return;
    }
    if (this.queue.length >= 8) throw new FileStorageError('Office 解析队列已满，请稍后重试', 503);
    await new Promise<void>((resolve, reject) => {
      const ready = () => {
        signal?.removeEventListener('abort', abort);
        resolve();
      };
      const abort = () => {
        const index = this.queue.indexOf(ready);
        if (index !== -1) this.queue.splice(index, 1);
        reject(signal?.reason);
      };
      this.queue.push(ready);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
}
