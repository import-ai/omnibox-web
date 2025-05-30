import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Globe, Lightbulb, Sparkles } from 'lucide-react';
import { ToolType } from '@/page/chat/chat-input/types';

const datasource = [
  {
    label: 'Web Search',
    value: ToolType.WEB_SEARCH,
    icon: <Globe />,
  },
  {
    label: 'Reason',
    value: ToolType.REASONING,
    icon: <Lightbulb />,
  },
  {
    label: 'Knowledge',
    value: ToolType.KNOWLEDGE_SEARCH,
    icon: <Sparkles />,
  },
];

interface IProps {
  tools: Array<ToolType>;
  onToolsChange: (tool: Array<ToolType>) => void;
}

export default function ChatTool(props: IProps) {
  const { tools, onToolsChange } = props;

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
            'font-normal rounded-full bg-[#F0F2F5] border-transparent [&_svg]:size-3 hover:text-blue-600 transition-colors',
            {
              'text-blue-600': tools.includes(item.value),
            },
          )}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  );
}
