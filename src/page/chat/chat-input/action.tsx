import { ArrowUp, ChevronDown } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { FORCE_ASK } from '@/const';
import { ChatMode } from '@/page/chat/chat-input/types';

interface IActionProps {
  disabled: boolean;
  onSend: () => void;
  loading: boolean;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export default function ChatAction(props: IActionProps) {
  const { t } = useTranslation();
  const { disabled, onSend, loading, mode, setMode } = props;

  return (
    <div className="flex items-center">
      {!FORCE_ASK && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="mr-1 pl-2 pr-1 font-normal"
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
          <Separator orientation="vertical" className="ml-0 mr-3 h-4" />
        </>
      )}
      {loading ? (
        <span className="cursor-not-allowed">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-full"
            disabled
          >
            <Spinner />
          </Button>
        </span>
      ) : disabled ? (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="cursor-not-allowed">
                <Button
                  size="icon"
                  variant="default"
                  className="size-8 rounded-lg"
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
        <Button size="icon" onClick={onSend} className="size-8 rounded-lg">
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
