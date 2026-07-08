import { ArrowUp, ChevronDown, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
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
import { FORCE_ASK } from '@/const';
import { ChatMode } from '@/page/chat/chat-input/types';

interface IActionProps {
  disabled: boolean;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export default function ChatAction(props: IActionProps) {
  const { t } = useTranslation();
  const { disabled, onSend, onStop, loading, mode, setMode } = props;

  return (
    <div className="flex items-center">
      {!FORCE_ASK && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="font-normal pl-2 pr-1 mr-1"
              >
                {t('chat.action.mode.' + mode)}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuCheckboxItem
                checked={mode === ChatMode.ASK}
                onCheckedChange={() => setMode(ChatMode.ASK)}
              >
                {t('chat.action.mode.ask')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={mode === ChatMode.WRITE}
                onCheckedChange={() => setMode(ChatMode.WRITE)}
              >
                {t('chat.action.mode.write')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-4 ml-0 mr-3" />
        </>
      )}
      {loading ? (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="default"
                className="rounded-full size-8"
                onClick={onStop}
              >
                <Square className="!size-3 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('chat.messages.actions.stop')}</TooltipContent>
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
            <TooltipContent>{t('chat.tips')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button size="icon" onClick={onSend} className="rounded-full size-8">
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
