import { Slot } from 'radix-ui';
import * as React from 'react';

import { Button as BaseButton } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  loading?: boolean;
};

export function Button({
  loading,
  disabled,
  children,
  onClickCapture,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      className={cn(
        'cursor-pointer',
        props.size === 'sm' && 'h-7 text-[0.8rem]',
        props.className
      )}
      disabled={loading || disabled}
      onClickCapture={event => {
        if (loading || disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClickCapture?.(event);
      }}
    >
      {loading
        ? [
            <Spinner key="spinner" />,
            <Slot.Slottable key="content">{children}</Slot.Slottable>,
          ]
        : children}
    </BaseButton>
  );
}
