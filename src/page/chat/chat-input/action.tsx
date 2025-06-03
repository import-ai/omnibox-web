import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ChevronDown, createLucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PauseIcon = createLucideIcon('pauseIcon', [
  [
    'rect',
    {
      key: 'rect1',
      x: '0.7',
      y: '0.7',
      width: '22.6',
      height: '22.6',
      rx: '11.3',
      stroke: 'black',
      strokeWidth: '1.4',
    },
  ],
  [
    'rect',
    {
      key: 'rect2',
      x: '7',
      y: '7',
      width: '10',
      height: '10',
      rx: '2',
      fill: '#111111',
    },
  ],
]);

interface IActionProps {
  disabled: boolean;
  onAction: (action?: 'stop' | 'disabled') => void;
  loading: boolean;
}

export default function ChatAction(props: IActionProps) {
  const { t } = useTranslation();
  const { disabled, onAction, loading } = props;
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
            {t('chat.action.mode.ask')}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuCheckboxItem checked={true}>
            {t('chat.action.mode.ask')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem disabled>
            {t('chat.action.mode.write')}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-4 ml-0 mr-3" />
      {loading ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={onStop}
          className="rounded-full size-8 [&_svg]:size-6"
        >
          <PauseIcon />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg size-8"
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
