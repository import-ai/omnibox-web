import { X } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { trackButtonClick } from '@/lib/trackButtonClick';
import { cn } from '@/lib/utils';

import { composerTextLayoutClassName } from './composerLayout';
import ComposerOverlay from './ComposerOverlay';
import type { ComposerState } from './composerState';
import { ComposerChatImage, IResTypeContext, ToolType } from './types';
import {
  type ChatInputHandle,
  useChatInputComposer,
} from './useChatInputComposer';

export type { ChatInputHandle } from './useChatInputComposer';

interface IProps {
  value: string;
  disabled: boolean;
  readOnly?: boolean;
  initialComposerState?: ComposerState;
  tools: ToolType[];
  selectedResources: IResTypeContext[];
  onChange: (value: string) => void;
  onComposerStateChange: (state: ComposerState) => void;
  onToolsChange: (value: ToolType[]) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onSend: () => void;
  images: ComposerChatImage[];
  onImageRemove: (imageId: string) => void;
  surface?: 'home' | 'conversation';
}

const ChatInput = forwardRef<ChatInputHandle, IProps>(
  function ChatInput(props, ref) {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<ComposerChatImage | null>(null);
    const invokerRef = useRef<HTMLButtonElement | null>(null);
    const getToolLabel = useCallback(
      (tool: Exclude<ToolType, ToolType.PRIVATE_SEARCH>) =>
        t(`chat.tools.${tool}`),
      [t]
    );
    const surface = props.surface ?? 'home';
    const composerTrackName = (action: 'select' | 'edit') =>
      surface === 'home'
        ? `chat_home_composer_${action}`
        : `chat_conversation_composer_${action}`;
    const composer = useChatInputComposer({
      ...props,
      getToolLabel,
      untitledLabel: t('untitled'),
    });

    useImperativeHandle(ref, () => composer.handle, [composer.handle]);

    return (
      <div className="mb-[2px] min-h-[60px] min-w-0">
        {props.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {props.images.map(image => (
              <div key={image.id} className="relative">
                <button
                  type="button"
                  aria-label={t('chat.image.preview')}
                  onClick={event => {
                    trackButtonClick('chat_image_open');
                    const handleClick = (
                      event: React.MouseEvent<HTMLButtonElement>
                    ) => {
                      invokerRef.current = event.currentTarget;
                      setPreview(image);
                    };
                    if (typeof handleClick === 'function') {
                      (handleClick as (value?: typeof event) => void)(event);
                    }
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="size-16 rounded-md object-cover"
                  />
                </button>
                <button
                  type="button"
                  aria-label={t('chat.image.remove')}
                  className="absolute -right-1 -top-1 z-10 rounded-full bg-foreground p-0.5 text-background"
                  disabled={props.readOnly}
                  onClick={event => {
                    trackButtonClick('chat_image_remove');
                    const handleClick = () => {
                      if (preview?.id === image.id) {
                        setPreview(null);
                      }
                      props.onImageRemove(image.id);
                    };
                    if (typeof handleClick === 'function') {
                      (handleClick as (value?: typeof event) => void)(event);
                    }
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <ImagePreviewDialog
          alt={preview?.name}
          open={preview !== null}
          src={preview?.url}
          invokerRef={invokerRef}
          onOpenChange={open => {
            if (!open) setPreview(null);
          }}
        />
        <div className="relative min-h-[60px] min-w-0">
          <ComposerOverlay
            text={composer.displayText}
            mentions={composer.mentions}
            toolRanges={composer.toolRanges}
            overlayRef={composer.overlayRef}
          />
          <textarea
            ref={composer.textareaRef}
            value={composer.displayText}
            rows={1}
            readOnly={props.readOnly}
            placeholder={t('chat.textarea.placeholder')}
            className={cn(
              'relative z-10 block min-h-[60px] max-h-[200px] w-full resize-none overflow-y-hidden border-0 bg-transparent text-transparent outline-hidden',
              composerTextLayoutClassName,
              'caret-foreground placeholder:text-muted-foreground selection:bg-[#117bfa]/20 selection:text-transparent'
            )}
            onBlur={composer.rememberSelection}
            onChange={event => {
              if (!props.readOnly) {
                trackButtonClick(composerTrackName('edit'));
              }
              composer.handleTextChange(event);
            }}
            onClick={() => {
              if (!props.readOnly) {
                trackButtonClick(composerTrackName('select'));
              }
              composer.rememberSelection();
            }}
            onCompositionEnd={() => composer.setIsComposing(false)}
            onCompositionStart={() => composer.setIsComposing(true)}
            onKeyDown={props.readOnly ? undefined : composer.handleKeyDown}
            onKeyUp={composer.rememberSelection}
            onScroll={composer.handleScroll}
            onSelect={composer.rememberSelection}
          />
        </div>
      </div>
    );
  }
);

export default ChatInput;
