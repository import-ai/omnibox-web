import { Permission } from '@/interface';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

export interface ActionProps {
  value: Permission;
  className?: string;
  afterAddon?: React.ReactNode;
  onChange: (value: Permission) => void;
  data: Array<{
    value: Permission;
    label: string;
    description?: string;
  }>;
}

export default function Action(props: ActionProps) {
  const { className, data, afterAddon, value, onChange } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className}>
        <div className="flex items-center text-gray-700">
          <span>{data.find((item) => item.value === value)?.label}</span>
          <ChevronDown className="h-5 w-5 ml-1" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        alignOffset={-10}
        className="w-[264px]"
      >
        {data.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onChange(item.value)}
            className="cursor-pointer justify-between hover:bg-gray-100"
          >
            <div>
              {item.description ? (
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  {item.description && (
                    <div className="text-gray-500 text-xs">
                      {item.description}
                    </div>
                  )}
                </div>
              ) : (
                item.label
              )}
            </div>
            {item.value === value && (
              <Check className="h-5 w-5 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
        {afterAddon}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
