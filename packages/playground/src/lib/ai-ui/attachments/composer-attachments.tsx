import type { CoreUserMessage } from '@mastra/core/llm';
import { classifyAttachment } from '@mastra/playground-ui/domains/chat/attachments/attachment-kind';
import type { ComposerAttachmentKind } from '@mastra/playground-ui/domains/chat/attachments/attachment-kind';
import { fileToBase64, getFileContentType, isRemoteUrl } from '@mastra/playground-ui/utils/file';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useAccount } from '@/domains/account/account-context';
import { storageUrl, uploadStoredFile } from '@/domains/account/storage-api';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export type { ComposerAttachmentKind } from '@mastra/playground-ui/domains/chat/attachments/attachment-kind';

export interface ComposerAttachment {
  id: string;
  /** The picked file. For URL attachments this is an empty File whose `name` is the URL. */
  file: File;
  name: string;
  contentType: string;
  kind: ComposerAttachmentKind;
  /** True when this attachment was added by URL (name is a remote link, e.g. https://, gs://, s3://). */
  isUrl: boolean;
}

interface ComposerAttachmentsContextValue {
  attachments: ComposerAttachment[];
  addFiles: (files: File[] | FileList) => Promise<void>;
  addUrl: (url: string) => Promise<void>;
  remove: (id: string) => void;
  /** Puts back attachments that were cleared for a message the server never received. */
  restore: (attachments: ComposerAttachment[]) => void;
  clear: () => void;
  isAddingAttachments: boolean;
  toCoreUserMessages: () => Promise<CoreUserMessage[]>;
}

const ComposerAttachmentsContext = createContext<ComposerAttachmentsContextValue | null>(null);

let attachmentCounter = 0;
const nextId = () => `att-${Date.now()}-${++attachmentCounter}`;

const toAttachment = (file: File): ComposerAttachment => {
  const isUrl = isRemoteUrl(file.name);
  const { contentType, kind } = classifyAttachment(file.name, file.type);
  return {
    id: nextId(),
    file,
    name: file.name,
    contentType,
    kind,
    isUrl,
  };
};

// A bounded text probe is only a fallback for unrecognized formats, not a security check.
const looksLikeText = (file: File): Promise<boolean> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        resolve(false);
        return;
      }
      try {
        const bytes = new Uint8Array(reader.result);
        let encoding = 'utf-8';
        if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
        if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
        // A bounded probe can end mid-character; only flush the decoder at EOF.
        const text = new TextDecoder(encoding, { fatal: true }).decode(bytes, { stream: file.size > bytes.length });
        resolve(
          Array.from(text).every(character => {
            const code = character.charCodeAt(0);
            return code >= 32 || code === 9 || code === 10 || code === 12 || code === 13;
          }),
        );
      } catch {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 8192));
  });

const attachmentToCoreUserMessage = async (att: ComposerAttachment): Promise<CoreUserMessage> => {
  if (att.kind === 'image') {
    return {
      role: 'user' as const,
      content: [
        {
          type: 'image' as const,
          image: att.isUrl ? att.name : await fileToBase64(att.file),
          mimeType: att.contentType,
        },
      ],
    };
  }

  if (att.kind === 'text' && !att.isUrl) {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error);
      reader.readAsText(att.file);
    });
    const name = att.name
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return { role: 'user', content: `<attachment name="${name}">${text}</attachment>` };
  }

  // Keep media bytes intact. Correct only the MIME prefix when browsers mislabel a file.
  const data = att.isUrl ? att.name : (await fileToBase64(att.file)).replace(/^data:[^;,]*/, `data:${att.contentType}`);
  return {
    role: 'user',
    content: [{ type: 'file', data, mimeType: att.contentType, filename: att.name }],
  };
};

export const ComposerAttachmentsProvider = ({
  children,
  controlled,
}: {
  children: ReactNode;
  controlled?: { value: ComposerAttachment[]; onChange: Dispatch<SetStateAction<ComposerAttachment[]>> };
}) => {
  const [localAttachments, setLocalAttachments] = useState<ComposerAttachment[]>([]);
  const attachments = controlled?.value ?? localAttachments;
  const setAttachments = controlled?.onChange ?? setLocalAttachments;
  const generation = useRef(0);
  const account = useAccount();
  const storageTarget = useStudioConfig();
  const persisted = useRef(new Map<string, Promise<CoreUserMessage>>());
  const [pendingAdditions, setPendingAdditions] = useState(0);
  useEffect(() => {
    const active = new Set(attachments.map(attachment => attachment.id));
    for (const id of persisted.current.keys()) if (!active.has(id)) persisted.current.delete(id);
  }, [attachments]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  const addFiles = useCallback(
    async (files: File[] | FileList) => {
      const currentGeneration = generation.current;
      setPendingAdditions(count => count + 1);
      try {
        const list = await Promise.all(
          Array.from(files).map(async file => {
            const attachment = toAttachment(file);
            if (
              attachment.kind === 'file' &&
              !attachment.contentType.startsWith('application/vnd.ms-excel') &&
              !attachment.contentType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml') &&
              (await looksLikeText(file))
            ) {
              return { ...attachment, kind: 'text' as const, contentType: 'text/plain' };
            }
            return attachment;
          }),
        );
        if (list.length > 0 && generation.current === currentGeneration) setAttachments(prev => [...prev, ...list]);
      } finally {
        if (generation.current === currentGeneration) setPendingAdditions(count => count - 1);
      }
    },
    [setAttachments],
  );

  const addUrl = useCallback(
    async (url: string) => {
      const currentGeneration = generation.current;
      setPendingAdditions(count => count + 1);
      try {
        const contentType = (await getFileContentType(url)) ?? 'application/octet-stream';
        // URL attachments are represented by an empty File named with the URL.
        const file = new File([], url, { type: contentType });
        if (generation.current === currentGeneration) setAttachments(prev => [...prev, toAttachment(file)]);
      } finally {
        if (generation.current === currentGeneration) setPendingAdditions(count => count - 1);
      }
    },
    [setAttachments],
  );

  const remove = useCallback(
    (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
    },
    [setAttachments],
  );

  const restore = useCallback(
    (restored: ComposerAttachment[]) => {
      setAttachments(prev => [...restored, ...prev]);
    },
    [setAttachments],
  );

  const clear = useCallback(() => {
    generation.current++;
    setPendingAdditions(0);
    setAttachments([]);
  }, [setAttachments]);

  const toCoreUserMessages = async () => {
    return Promise.all(
      attachments.map(async attachment => {
        if (!account || attachment.isUrl) return attachmentToCoreUserMessage(attachment);
        const cached = persisted.current.get(attachment.id);
        if (cached) return cached;
        const conversion = (async (): Promise<CoreUserMessage> => {
          const file = await uploadStoredFile(storageTarget, attachment.file, attachment.id, attachment.contentType);
          const escape = (value: string) =>
            value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
          const reference = `文件已保存到当前用户工作区：${file.path}\n请使用 mastra_workspace_read_file 读取文件内容；大文档可按行分段读取。\n下载地址：${storageUrl(storageTarget, '/download', { path: file.path })}`;
          if (attachment.kind === 'image' || attachment.contentType === 'application/pdf') {
            const original = await attachmentToCoreUserMessage(attachment);
            return {
              role: 'user',
              content: [
                ...(typeof original.content === 'string'
                  ? [{ type: 'text' as const, text: original.content }]
                  : original.content),
                { type: 'text', text: `<workspace-attachment>\n${reference}\n</workspace-attachment>` },
              ],
            };
          }
          return { role: 'user', content: `<attachment name="${escape(attachment.name)}">${reference}</attachment>` };
        })();
        persisted.current.set(attachment.id, conversion);
        try {
          return await conversion;
        } catch (error) {
          persisted.current.delete(attachment.id);
          throw error;
        }
      }),
    );
  };

  const value: ComposerAttachmentsContextValue = {
    attachments,
    addFiles,
    addUrl,
    remove,
    restore,
    clear,
    isAddingAttachments: pendingAdditions > 0,
    toCoreUserMessages,
  };

  return <ComposerAttachmentsContext.Provider value={value}>{children}</ComposerAttachmentsContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- context hook intentionally co-located with its provider
export const useComposerAttachments = (): ComposerAttachmentsContextValue => {
  const ctx = useContext(ComposerAttachmentsContext);
  if (!ctx) {
    throw new Error('useComposerAttachments must be used within a ComposerAttachmentsProvider');
  }
  return ctx;
};
