import { useEffect, useRef } from 'react';

export function ConversationBinaryPreview({ blob, name, pdf }: { blob: Blob; name: string; pdf: boolean }) {
  const image = useRef<HTMLImageElement>(null);
  const document = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    const element = pdf ? document.current : image.current;
    if (element) element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob, pdf]);
  return pdf ? (
    <iframe ref={document} title={name} className="h-full min-h-96 w-full border-0" />
  ) : (
    <img ref={image} alt={name} className="mx-auto max-h-full max-w-full rounded-lg object-contain" />
  );
}
