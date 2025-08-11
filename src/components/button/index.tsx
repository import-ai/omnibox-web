import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button as ButtonUI, ButtonProps } from '@/components/ui/button';

interface ButtonLoadingProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

export function Button(props: ButtonLoadingProps) {
  const { loading, children, ...rest } = props;

  if (loading) {
    return (
      <ButtonUI disabled {...rest}>
        <Loader2 className="animate-spin" />
        {children}
      </ButtonUI>
    );
  }
  return <ButtonUI {...rest}>{children}</ButtonUI>;
}
