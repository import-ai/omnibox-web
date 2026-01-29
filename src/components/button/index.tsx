import React from 'react';

import { Button as BaseButton, ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

interface ButtonLoadingProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
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
        ref={ref}
        variant={variant}
        className={cn('shadow-none bg-transparent', className)}
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
