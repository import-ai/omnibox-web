import type React from 'react';

import { DialogContent as BaseDialogContent } from '@/components/ui/dialog';
import { isInsideAliyunCaptcha } from '@/lib/captcha';
import {
  type ButtonTrackProps,
  trackButtonClick,
} from '@/lib/trackButtonClick';

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
  onClickCapture,
  onEscapeKeyDown,
  outsideCloseTrackName,
  outsideCloseTarget,
  closeDisabled = false,
  closeTrackProps,
  ...props
}: React.ComponentProps<typeof BaseDialogContent> & {
  outsideCloseTrackName?: string;
  outsideCloseTarget?: string;
  closeDisabled?: boolean;
  closeTrackProps?: ButtonTrackProps;
}) {
  return (
    <BaseDialogContent
      {...props}
      onClickCapture={event => {
        onClickCapture?.(event);
        const close =
          event.target instanceof Element
            ? event.target.closest('[data-slot="dialog-close"]')
            : null;
        // Only the generated close button; custom close actions own their tracking.
        if (close?.parentElement !== event.currentTarget) return;
        if (closeDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!event.defaultPrevented) {
          const name = dialogCloseTrackName(
            outsideCloseTrackName,
            outsideCloseTarget
          );
          if (name)
            trackButtonClick(name, {
              ...closeTrackProps,
              dismiss: 'button',
              target: outsideCloseTarget,
            });
        }
      }}
      onEscapeKeyDown={event => {
        if (closeDisabled) event.preventDefault();
        else onEscapeKeyDown?.(event);
      }}
      onPointerDownOutside={event => {
        if (closeDisabled || isInsideAliyunCaptcha(event.target)) {
          event.preventDefault();
          return;
        }
        onPointerDownOutside?.(event);
        if (
          !event.defaultPrevented &&
          outsideCloseTrackName &&
          outsideCloseTarget
        ) {
          // Radix and onInteractOutside may still prevent dismissal.
          queueMicrotask(() => {
            if (event.defaultPrevented) return;
            trackButtonClick(outsideCloseTrackName, {
              ...closeTrackProps,
              dismiss: 'outside',
              target: outsideCloseTarget,
            });
          });
        }
      }}
      onFocusOutside={event => {
        if (closeDisabled || isInsideAliyunCaptcha(event.target)) {
          event.preventDefault();
          return;
        }
        onFocusOutside?.(event);
      }}
    />
  );
}

export function dialogCloseTrackName(outsideName?: string, target?: string) {
  return outsideName?.endsWith('_overlay_close') && target
    ? outsideName.replace(/_overlay_close$/, `_${target}_close`)
    : undefined;
}
