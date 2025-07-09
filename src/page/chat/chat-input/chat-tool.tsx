import { cn } from '@/lib/utils';
import ThinkTool from './think-tool';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe, Sparkles } from 'lucide-react';
import { type IResTypeContext, ToolType } from '@/page/chat/chat-input/types';

interface IProps {
  tools: Array<ToolType>;
  thinking: boolean | '';
  context: IResTypeContext[];
  onThink: (thinking: boolean | '') => void;
  onToolsChange: (tool: Array<ToolType>) => void;
}

export default function ChatTool(props: IProps) {
  const { tools, context, thinking, onThink, onToolsChange } = props;
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {[
        {
          label: 'private_search',
          value: ToolType.PRIVATE_SEARCH,
          icon: <Sparkles />,
        },
        {
          label: 'web_search',
          value: ToolType.WEB_SEARCH,
          icon: <Globe />,
        },
      ].map((item) => (
        <Button
          size="sm"
          key={item.value}
          variant="outline"
          onClick={() => {
            if (tools.includes(item.value)) {
              onToolsChange(tools.filter((target) => target !== item.value));
            } else {
              onToolsChange([...tools, item.value]);
            }
          }}
          className={cn(
            'font-normal rounded-full bg-[#f3f5f7] dark:text-white dark:bg-[#404040] border-transparent [&_svg]:size-4 hover:bg-[#e7e9ea] dark:hover:bg-[#666666] transition-colors',
            {
              'text-[#117bfa] bg-[#cfe5fe] hover:text-[#117bfa] hover:bg-[#cfe5fe] dark:text-[#60a5fb] dark:bg-[#323f51] dark:hover:text-[#60a5fb] dark:hover:bg-[#323f51]':
                tools.includes(item.value) ||
                (item.value === ToolType.PRIVATE_SEARCH && context.length > 0),
            },
          )}
        >
          {item.icon}
          <span className="hidden md:block">
            {t('chat.tools.' + item.label)}
          </span>
        </Button>
      ))}
      <ThinkTool thinking={thinking} onThink={onThink} />
    </div>
  );
}
