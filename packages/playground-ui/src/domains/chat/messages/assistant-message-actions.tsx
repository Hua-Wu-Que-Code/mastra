import { ProviderLogo } from '@/domains/llm';
import { Button } from '@/ds/components/Button';
import { MessageCopyButton, MessageMetadata } from '@/ds/components/Message';
import { IconStopCircle } from '@/ds/icons/central/IconStopCircle';
import { IconVoiceSimple } from '@/ds/icons/central/IconVoiceSimple';
import { t as studioT, useLocale } from '@/lib/i18n';

export function AssistantMessageActions({
  text,
  modelMetadata,
  isSpeaking,
  onReadAloud,
  onStopSpeaking,
}: {
  text: string;
  modelMetadata?: { modelId: string; modelProvider: string };
  isSpeaking?: boolean;
  onReadAloud?: (text: string) => void;
  onStopSpeaking?: () => void;
}) {
  useLocale();
  return (
    <>
      <MessageCopyButton text={text} />
      {modelMetadata && (
        <MessageMetadata>
          <ProviderLogo providerId={modelMetadata.modelProvider} size={14} />
          <span>
            {modelMetadata.modelProvider}/{modelMetadata.modelId}
          </span>
        </MessageMetadata>
      )}
      {(onReadAloud || onStopSpeaking) &&
        (isSpeaking ? (
          <Button
            variant="ghost"
            size="icon-sm"
            tooltip={studioT('Stop')}
            aria-label={studioT('Stop')}
            onClick={() => onStopSpeaking?.()}
          >
            <IconStopCircle />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            tooltip={studioT('Read aloud')}
            aria-label={studioT('Read aloud')}
            onClick={() => onReadAloud?.(text)}
          >
            <IconVoiceSimple />
          </Button>
        ))}
    </>
  );
}
