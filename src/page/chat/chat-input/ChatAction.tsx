import { ArrowUp, ChevronDown, Square } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import { FORCE_ASK } from '@/const';
import { onOverlayClose, trackButtonClick } from '@/lib/trackButtonClick';
import { ChatMode } from '@/page/chat/chat-input/types';
import type { StreamState } from '@/page/chat/conversation/chatStreamRecovery';

interface IActionProps {
  surface?: 'home' | 'conversation';
  disabled: boolean;
  disabledReason?: string;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  waitingForAssistantDelta: boolean;
  streamState?: StreamState;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export default function ChatAction(props: IActionProps) {
  const { t } = useTranslation();
  const [stopping, setStopping] = useState(false);
  const {
    disabled,
    surface,
    disabledReason,
    onSend,
    onStop,
    loading,
    waitingForAssistantDelta,
    streamState = 'connected',
    mode,
    setMode,
  } = props;

  return (
    <div className="flex items-center">
      {!FORCE_ASK && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                trackName="chat_mode_open"
                trackProps={{ surface }}
                size="sm"
                variant="ghost"
                className="font-normal pl-2 pr-1 mr-1"
              >
                {t('chat.action.mode.' + mode)}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              onPointerDownOutside={onOverlayClose(
                'chat_overlay_close',
                'mode'
              )}
              side="bottom"
              align="end"
            >
              <DropdownMenuCheckboxItem
                checked={mode === ChatMode.ASK}
                className="[&_svg]:text-blue-500! [&_path]:text-blue-500!"
                onCheckedChange={() => {
                  trackButtonClick('chat_mode_select', {
                    surface,
                    mode: ChatMode.ASK,
                  });
                  setMode(ChatMode.ASK);
                }}
              >
                {t('chat.action.mode.ask')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={mode === ChatMode.WRITE}
                className="[&_svg]:text-blue-500! [&_path]:text-blue-500!"
                onCheckedChange={() => {
                  trackButtonClick('chat_mode_select', {
                    surface,
                    mode: ChatMode.WRITE,
                  });
                  setMode(ChatMode.WRITE);
                }}
              >
                {t('chat.action.mode.write')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-4 ml-0 mr-3" />
        </>
      )}
      {stopping ? (
        <Button
          size="icon"
          className="rounded-full size-8"
          disabled
          aria-label={t('chat.stopping')}
        >
          <Spinner />
        </Button>
      ) : waitingForAssistantDelta ? (
        <span className="cursor-not-allowed">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full size-8"
            disabled
          >
            <Spinner />
          </Button>
        </span>
      ) : loading ? (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                trackName="chat_response_cancel"
                trackProps={{ surface }}
                size="icon"
                variant="default"
                className="rounded-full size-8"
                onClick={async () => {
                  if (stopping) return;
                  setStopping(true);
                  try {
                    await onStop?.();
                  } finally {
                    setStopping(false);
                  }
                }}
              >
                <Square className="size-3! fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {streamState === 'recovering'
                ? t('chat.stream.recovering')
                : streamState === 'offline'
                  ? t('chat.stream.offline')
                  : t('chat.messages.actions.stop')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : disabled ? (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="cursor-not-allowed">
                <Button
                  size="icon"
                  variant="default"
                  className="rounded-full size-8"
                  disabled
                >
                  <ArrowUp />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{disabledReason ?? t('chat.tips')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                trackName="chat_message_send"
                trackProps={{ surface }}
                size="icon"
                onClick={onSend}
                className="rounded-full size-8"
              >
                <ArrowUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('chat.send')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
