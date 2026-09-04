import { X } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { composerTextLayoutClassName } from './composerLayout';
import ComposerOverlay from './ComposerOverlay';
import type { ComposerState } from './composerState';
import { ChatImageInput, IResTypeContext, ToolType } from './types';
import {
  type ChatInputHandle,
  useChatInputComposer,
} from './useChatInputComposer';

export type { ChatInputHandle } from './useChatInputComposer';

interface IProps {
  value: string;
  disabled: boolean;
  initialComposerState?: ComposerState;
  tools: ToolType[];
  selectedResources: IResTypeContext[];
  onChange: (value: string) => void;
  onComposerStateChange: (state: ComposerState) => void;
  onToolsChange: (value: ToolType[]) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onSend: () => void;
  images: ChatImageInput[];
  onImageRemove: (attachmentId: string) => void;
}

const ChatInput = forwardRef<ChatInputHandle, IProps>(
  function ChatInput(props, ref) {
    const { t } = useTranslation();
    const getToolLabel = useCallback(
      (tool: Exclude<ToolType, ToolType.PRIVATE_SEARCH>) =>
        t(`chat.tools.${tool}`),
      [t]
    );
    const composer = useChatInputComposer({
      ...props,
      getToolLabel,
      untitledLabel: t('untitled'),
    });

    useImperativeHandle(ref, () => composer.handle, [composer.handle]);

    return (
      <div className="relative mb-[2px] min-h-[60px] min-w-0">
        {props.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {props.images.map(image => (
              <div key={image.attachment_id} className="relative">
                <img
                  src={image.url}
                  alt={image.name}
                  className="size-16 rounded-md object-cover"
                />
                <button
                  type="button"
                  aria-label={t('chat.image.remove')}
                  className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background"
                  onClick={() => props.onImageRemove(image.attachment_id)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          placeholder={t('chat.textarea.placeholder')}
          className={cn(
            'relative z-10 block min-h-[60px] max-h-[200px] w-full resize-none overflow-y-hidden border-0 bg-transparent text-transparent outline-none',
            composerTextLayoutClassName,
            'caret-foreground placeholder:text-[#9CA3AF] selection:bg-[#117bfa]/20 selection:text-transparent dark:placeholder:text-gray-400'
          )}
          onBlur={composer.rememberSelection}
          onChange={composer.handleTextChange}
          onClick={composer.rememberSelection}
          onCompositionEnd={() => composer.setIsComposing(false)}
          onCompositionStart={() => composer.setIsComposing(true)}
          onKeyDown={composer.handleKeyDown}
          onKeyUp={composer.rememberSelection}
          onScroll={composer.handleScroll}
          onSelect={composer.rememberSelection}
        />
      </div>
    );
  }
);

export default ChatInput;
