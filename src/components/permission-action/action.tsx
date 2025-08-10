import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Permission } from '@/interface';
import { cn } from '@/lib/utils';

export interface ActionProps {
  value: Permission;
  className?: string;
  disabled?: boolean;
  afterAddon?: React.ReactNode;
  onChange: (value: Permission) => void;
  data: Array<{
    value: Permission;
    label: string;
    description?: string;
  }>;
}

export default function Action(props: ActionProps) {
  const { className, data, disabled, afterAddon, value, onChange } = props;
  const { t } = useTranslation();
  const target = data.find(item => item.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(className, { 'opacity-40': disabled })}
      >
        <div className="flex items-center text-gray-600 dark:text-white">
          <span>
            {target && target.label ? target.label : t(`permission.${value}`)}
          </span>
          {!disabled && <ChevronDown className="h-5 w-5 ml-1" />}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        alignOffset={-10}
        className="w-[264px]"
      >
        {data.map(item => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onChange(item.value)}
            className="cursor-pointer justify-between hover:bg-gray-100 dark:hover:bg-gray-400"
          >
            <div>
              {item.description ? (
                <div>
                  <div>{item.label}</div>
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
              <Check className="h-5 w-5 text-blue-600 dark:text-white" />
            )}
          </DropdownMenuItem>
        ))}
        {afterAddon}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
