import type React from 'react';

import { CommandInput as BaseCommandInput } from '@/components/ui/Command';

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof BaseCommandInput>) {
  return (
    <div className="contents [&_[data-slot=command-input-wrapper]]:pt-0 [&_[data-slot=input-group]]:border-0! [&_[data-slot=input-group]]:bg-transparent! [&_[data-slot=input-group]]:dark:bg-transparent!">
      <BaseCommandInput {...props} className={className} />
    </div>
  );
}

export { CommandInput };
