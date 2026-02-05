import React from 'react';

import { Button as BaseButton, ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

interface ButtonLoadingProps extends Omit<ButtonProps, 'variant'> {
  loading?: boolean;
  children: React.ReactNode;
  variant?: ButtonProps['variant'] | 'outline-border';
}

function CustomButton(props: ButtonLoadingProps) {
  const { children, variant = 'default', className, ...rest } = props;
  if (variant === 'destructive') {
    return (
      <BaseButton
        variant="outline"
        className={cn(
          'bg-transparent text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground',
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
        variant={variant}
        className={cn('shadow-none bg-transparent', className)}
        {...rest}
      >
        {children}
      </BaseButton>
    );
  }
  if (variant === 'outline-border') {
    return (
      <BaseButton
        variant="outline"
        className={cn(
          'shadow-none bg-transparent hover:bg-background dark:border-neutral-700',
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
      variant={variant}
      className={cn('shadow-none', className)}
      {...rest}
    >
      {children}
    </BaseButton>
  );
}

export function Button(props: ButtonLoadingProps) {
  const { loading, children, ...rest } = props;

  if (loading) {
    return (
      <CustomButton disabled {...rest}>
        <Spinner />
        {children}
      </CustomButton>
    );
  }
  return <CustomButton {...rest}>{children}</CustomButton>;
}
