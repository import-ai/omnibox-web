import { Slot } from 'radix-ui';
import * as React from 'react';

import { Button as BaseButton } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import {
  type ButtonTrackProps,
  trackButtonClick,
} from '@/lib/trackButtonClick';
import { cn } from '@/lib/utils';

/** Press feedback for native `<button>` elements outside `@/components/Button`. */
export const buttonPressClassName =
  'transition-all active:translate-y-px select-none';

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  loading?: boolean;
  /** `module_object_action`. Omit it and this button is not tracked. */
  trackName?: string;
  trackProps?: ButtonTrackProps;
};

export function Button({
  loading,
  disabled,
  children,
  onClickCapture,
  trackName,
  trackProps,
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
        if (trackName) {
          trackButtonClick(trackName, {
            ...trackProps,
            ...(props.variant ? { variant: props.variant } : undefined),
            ...(props.size ? { size: props.size } : undefined),
          });
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
