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
          'border-destructive bg-transparent text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground active:bg-[#D95E52]',
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
          'border-neutral-200 bg-white shadow-none hover:bg-neutral-100 active:border-neutral-300 active:bg-neutral-200 disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-neutral-200 disabled:opacity-100 dark:!border-neutral-700 dark:bg-transparent dark:hover:bg-neutral-600 dark:active:bg-neutral-700 dark:disabled:border-neutral-700 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500 dark:disabled:hover:bg-neutral-700',
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
          'shadow-none hover:bg-neutral-800 active:bg-neutral-700 disabled:bg-neutral-400 disabled:text-neutral-200 disabled:opacity-100 dark:bg-white dark:hover:bg-neutral-100 dark:active:bg-neutral-300 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500 dark:disabled:hover:bg-neutral-700',
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
