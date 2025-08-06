import { cn } from '@/lib/utils';
import { isBoolean } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, Lightbulb } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

interface IProps {
  thinking: boolean | '';
  onThink: (thinking: boolean | '') => void;
}

export default function ThinkTool(props: IProps) {
  const { thinking, onThink } = props;
  const { t } = useTranslation();
  const thinkIsBoolean = isBoolean(thinking);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'font-normal rounded-full bg-[#f3f5f7] dark:text-white dark:bg-[#404040] border-transparent [&_svg]:size-4 hover:bg-[#e7e9ea] dark:hover:bg-[#666666] transition-colors focus-visible:none focus-visible:ring-0',
            {
              'text-[#117bfa] bg-[#cfe5fe] hover:text-[#117bfa] hover:bg-[#cfe5fe] dark:text-[#60a5fb] dark:bg-[#323f51] dark:hover:text-[#60a5fb] dark:hover:bg-[#323f51]':
                thinking || !thinkIsBoolean,
            }
          )}
        >
          <Lightbulb />
          <span className="hidden md:block">
            {t('chat.tools.reasoning')}
            {thinkIsBoolean && thinking && <>：{t('chat.tools.on')}</>}
            {!thinkIsBoolean && <>：{t('chat.tools.auto')}</>}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => onThink('')}
          className="flex justify-between items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
        >
          <div>
            <div>{t('chat.tools.auto')}</div>
            <div className="text-muted-foreground text-xs">
              {t('chat.tools.smart_switch')}
            </div>
          </div>
          {!thinkIsBoolean && (
            <Check className="h-5 w-5 mt-1 text-blue-600 dark:text-white" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onThink(true)}
          className="flex justify-between items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
        >
          <div>
            <div>{t('chat.tools.on')}</div>
            <div className="text-muted-foreground text-xs">
              {t('chat.tools.output_answer')}
            </div>
          </div>
          {thinkIsBoolean && thinking && (
            <Check className="h-5 w-5 mt-1 text-blue-600 dark:text-white" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onThink(false)}
          className="flex justify-between items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
        >
          <div>
            <div>{t('chat.tools.off')}</div>
            <div className="text-muted-foreground text-xs">
              {t('chat.tools.direct_answer')}
            </div>
          </div>
          {thinkIsBoolean && !thinking && (
            <Check className="h-5 w-5 mt-1 text-blue-600 dark:text-white" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
