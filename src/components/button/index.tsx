import React from 'react';

import { Button as BaseButton, ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

interface ButtonLoadingProps extends Omit<ButtonProps, 'variant'> {
  loading?: boolean;
  children: React.ReactNode;
  variant?: ButtonProps['variant'];
}

const CustomButton = React.forwardRef<
  React.ElementRef<typeof BaseButton>,
  ButtonLoadingProps
>(function CustomButton(props, ref) {
  const { children, variant = 'default', className, ...rest } = props;
  if (variant === 'destructive') {
    return (
      <BaseButton
        ref={ref}
        variant="outline"
        className={cn(
          'bg-transparent text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground active:bg-[#D95E52] text-xs font-medium',
          className
        )}
        {...rest}
      >
        {children}
      </BaseButton>
    );
  }
  if (variant === 'outline') {
    return (
      <BaseButton
        ref={ref}
        variant={variant}
        className={cn(
          'shadow-none bg-white  border-neutral-200 hover:bg-neutral-100 active:border-neutral-300 dark:bg-transparent dark:!border-neutral-700 dark:hover:bg-neutral-600 active:bg-neutral-200 dark:active:bg-neutral-700',
          className
        )}
        {...rest}
      >
        {children}
      </BaseButton>
    );
  }
  if (variant === 'default') {
    return (
      <BaseButton
        ref={ref}
        variant="default"
        className={cn(
          'shadow-none dark:bg-white hover:bg-neutral-800 active:bg-neutral-700 dark:active:bg-neutral-300 dark:hover:bg-neutral-100',
          className
        )}
        {...rest}
      >
        {children}
      </BaseButton>
    );
  }
  return (
    <BaseButton
      ref={ref}
      variant={variant}
      className={cn('shadow-none', className)}
      {...rest}
    >
      {children}
    </BaseButton>
  );
});

export const Button = React.forwardRef<
  React.ElementRef<typeof BaseButton>,
  ButtonLoadingProps
>(function Button(props, ref) {
  const { loading, children, ...rest } = props;

  if (loading) {
    return (
      <CustomButton ref={ref} disabled {...rest}>
        <Spinner />
        {children}
      </CustomButton>
    );
  }
  return (
    <CustomButton ref={ref} {...rest}>
      {children}
    </CustomButton>
  );
});
