import { Globe, Lightbulb, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { FORCE_PRIVATE_SEARCH } from '@/const.ts';
import { cn } from '@/lib/utils';
import { IResTypeContext, ToolType } from '@/page/chat/chat-input/types';

const datasource = [
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
  {
    label: 'reasoning',
    value: ToolType.REASONING,
    icon: <Lightbulb />,
  },
].filter(
  item => !(FORCE_PRIVATE_SEARCH && item.value === ToolType.PRIVATE_SEARCH)
);

interface IProps {
  tools: Array<ToolType>;
  context: IResTypeContext[];
  onToolsChange: (tool: Array<ToolType>) => void;
  disabled?: boolean;
}

export default function ChatTool(props: IProps) {
  const { tools, context, onToolsChange, disabled } = props;
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {datasource.map(item => (
        <Button
          size="sm"
          key={item.value}
          variant="outline"
          disabled={disabled}
          onClick={() => {
            if (tools.includes(item.value)) {
              onToolsChange(tools.filter(target => target !== item.value));
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
            }
          )}
        >
          {item.icon}
          <span className="hidden md:block">
            {t('chat.tools.' + item.label)}
          </span>
        </Button>
      ))}
    </div>
  );
}
