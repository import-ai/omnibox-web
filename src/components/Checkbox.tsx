import { Check, Minus } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
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
      'peer size-4 shrink-0 rounded-[4px] border border-input bg-background text-white shadow-xs transition-shadow focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 data-[state=indeterminate]:border-blue-500 data-[state=indeterminate]:bg-blue-500',
      muted && 'border-blue-500/50! bg-blue-500/50!',
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
