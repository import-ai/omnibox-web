import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button as ButtonUI, ButtonProps } from '@/components/ui/button';

interface ButtonLoadingProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

export function Button(props: ButtonLoadingProps) {
  const { loading, children, ...rest } = props;
  return (
    <ButtonUI disabled={loading} {...rest}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </ButtonUI>
  );
}
