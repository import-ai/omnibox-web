import type React from 'react';

import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectGroup,
  SelectItem as BaseSelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';

function SelectContent({
  position = 'popper',
  ...props
}: React.ComponentProps<typeof BaseSelectContent>) {
  return <BaseSelectContent position={position} {...props} />;
}

const selectItemCheckClassName =
  '[&_svg]:text-blue-500! [&_svg]:stroke-blue-500! [&_path]:text-blue-500! [&_path]:stroke-blue-500!';

function SelectItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectItem>) {
  return (
    <BaseSelectItem
      className={cn(selectItemCheckClassName, className)}
      {...props}
    />
  );
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
