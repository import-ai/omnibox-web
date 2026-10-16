import type React from 'react';

import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

function SelectContent({
  position = 'popper',
  ...props
}: React.ComponentProps<typeof BaseSelectContent>) {
  return <BaseSelectContent position={position} {...props} />;
}

export {
  BaseSelect as Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
