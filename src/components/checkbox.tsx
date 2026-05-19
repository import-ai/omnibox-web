import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> & {
  muted?: boolean;
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, muted = false, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={checked}
    data-muted={!!muted}
    className={cn(
      'peer size-4 shrink-0 rounded-sm text-white border border-[#d4d4d4] focus-visible:outline-none dark:border-[#fafafa]',
      'hover:border-blue-500 dark:hover:border-blue-500',
      'data-[state=checked]:border-[#0090ff] data-[state=checked]:bg-[#0090ff] dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500',
      'data-[state=indeterminate]:border-blue-300 data-[state=indeterminate]:bg-blue-300 dark:data-[state=indeterminate]:border-blue-300 dark:data-[state=indeterminate]:bg-blue-300',
      'disabled:cursor-not-allowed disabled:text-[#d4d4d4] disabled:border-[#d4d4d4] disabled:bg-[#f5f5f5] dark:disabled:border-neutral-700 dark:disabled:text-neutral-800 dark:bg-transparent',
      muted &&
        'data-[muted=true]:border-blue-400 data-[muted=true]:bg-[#93c5fd] dark:data-[muted=true]:border-blue-400 dark:data-[muted=true]:bg-blue-300',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      {checked === 'indeterminate' ? (
        <Minus className="size-3" />
      ) : (
        <Check className="size-3" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
