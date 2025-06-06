import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Globe, Lightbulb, Sparkles } from 'lucide-react';
import { type IResTypeContext, ToolType } from '@/page/chat/chat-input/types';
import { useTranslation } from 'react-i18next';

const datasource = [
  {
    label: 'knowledge_search',
    value: ToolType.KNOWLEDGE_SEARCH,
    icon: <Sparkles />,
  },
  {
    label: 'reasoning',
    value: ToolType.REASONING,
    icon: <Lightbulb />,
  },
  {
    label: 'web_search',
    value: ToolType.WEB_SEARCH,
    icon: <Globe />,
  },
];

interface IProps {
  tools: Array<ToolType>;
  onToolsChange: (tool: Array<ToolType>) => void;
  context: IResTypeContext[];
}

export default function ChatTool(props: IProps) {
  const { t } = useTranslation();
  const { tools, onToolsChange, context } = props;

  return (
    <div className="flex items-center gap-3">
      {datasource.map((item) => (
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
            'font-normal rounded-full bg-gray-50 dark:bg-neutral-700 border-transparent [&_svg]:size-4 hover:text-blue-600 dark:hover:text-blue-300 transition-colors',
            {
              'text-blue-600 dark:text-blue-400':
                tools.includes(item.value) ||
                (item.value === ToolType.KNOWLEDGE_SEARCH &&
                  context.length > 0),
            },
          )}
        >
          {item.icon}
          {t('chat.tools.' + item.label)}
        </Button>
      ))}
    </div>
  );
}
