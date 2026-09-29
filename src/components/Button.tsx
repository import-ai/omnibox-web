import { Slot } from 'radix-ui';
import * as React from 'react';

import { Button as BaseButton } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  loading?: boolean;
};

export function Button({ loading, disabled, children, ...props }: ButtonProps) {
  return (
    <BaseButton {...props} disabled={loading || disabled}>
      {loading ? (
        <>
          <Spinner />
          <Slot.Slottable>{children}</Slot.Slottable>
        </>
      ) : (
        children
      )}
    </BaseButton>
  );
}
