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
        className={cn(
          className,
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
        )}
      >
        <div className="flex items-center text-gray-600 dark:text-white">
          <span>
            {target && target.label ? target.label : t(`permission.${value}`)}
          </span>
          {!disabled && <ChevronDown className="ml-1 size-5" />}
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
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  )}
                </div>
              ) : (
                item.label
              )}
            </div>
            {item.value === value && (
              <Check className="size-5 text-blue-600 dark:text-white" />
            )}
          </DropdownMenuItem>
        ))}
        {afterAddon}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
