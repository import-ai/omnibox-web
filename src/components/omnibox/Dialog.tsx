import type React from 'react';

import { DialogContent as BaseDialogContent } from '@/components/ui/Dialog';
import { isInsideAliyunCaptcha } from '@/lib/captcha';

export {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

export function DialogContent({
  onPointerDownOutside,
  onFocusOutside,
  ...props
}: React.ComponentProps<typeof BaseDialogContent>) {
  return (
    <BaseDialogContent
      {...props}
      onPointerDownOutside={event => {
        if (isInsideAliyunCaptcha(event.target)) {
          event.preventDefault();
          return;
        }
        onPointerDownOutside?.(event);
      }}
      onFocusOutside={event => {
        if (isInsideAliyunCaptcha(event.target)) {
          event.preventDefault();
          return;
        }
        onFocusOutside?.(event);
      }}
    />
  );
}
