import type React from 'react';

import { DialogContent as BaseDialogContent } from '@/components/ui/dialog';
import { isInsideAliyunCaptcha } from '@/lib/captcha';
import { trackButtonClick } from '@/lib/trackButtonClick';

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
} from '@/components/ui/dialog';

export function DialogContent({
  onPointerDownOutside,
  onFocusOutside,
  outsideCloseTrackName,
  outsideCloseTarget,
  ...props
}: React.ComponentProps<typeof BaseDialogContent> & {
  outsideCloseTrackName?: string;
  outsideCloseTarget?: string;
}) {
  return (
    <BaseDialogContent
      {...props}
      onPointerDownOutside={event => {
        if (isInsideAliyunCaptcha(event.target)) {
          event.preventDefault();
          return;
        }
        onPointerDownOutside?.(event);
        if (
          !event.defaultPrevented &&
          outsideCloseTrackName &&
          outsideCloseTarget
        ) {
          trackButtonClick(outsideCloseTrackName, {
            dismiss: 'outside',
            target: outsideCloseTarget,
          });
        }
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
