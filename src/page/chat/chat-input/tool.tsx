import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Globe, Sparkles, Lightbulb } from 'lucide-react';

const datasource = [
  {
    label: 'Web Search',
    value: 'search',
    icon: <Globe />,
  },
  {
    label: 'Reason',
    value: 'reason',
    icon: <Lightbulb />,
  },
  {
    label: 'Knowledge',
    value: 'knowledge',
    icon: <Sparkles />,
  },
];

interface IProps {
  tools: Array<string>;
  onToolsChange: (tool: Array<string>) => void;
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
