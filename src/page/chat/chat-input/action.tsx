import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ChevronDown, CircleStop } from 'lucide-react';
import { type ChatActionType, ChatMode } from '@/page/chat/chat-input/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IActionProps {
  disabled: boolean;
  onAction: (action?: ChatActionType) => void;
  loading: boolean;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export default function ChatAction(props: IActionProps) {
  const { t } = useTranslation();
  const { disabled, onAction, loading, mode, setMode } = props;
  const onStop = () => {
    onAction('stop');
  };
  const onSubmit = () => {
    if (disabled || loading) {
      return;
    }
    onAction();
  };

  return (
    <div className="flex items-center">
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
          <DropdownMenuCheckboxItem
            checked={mode === ChatMode.COMPOSE}
            onCheckedChange={() => setMode(ChatMode.COMPOSE)}
          >
            {t('chat.action.mode.compose')}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-4 ml-0 mr-3" />
      {loading ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={onStop}
          className="rounded-full size-8 [&_svg]:size-6 text-black dark:text-white"
        >
          <CircleStop />
        </Button>
      ) : disabled ? (
        <Button size="icon" className="rounded-lg size-8 bg-[#edeff2]">
          <ArrowUp className="text-[#999999]" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={onSubmit}
          className="rounded-lg size-8 bg-black dark:bg-white"
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
