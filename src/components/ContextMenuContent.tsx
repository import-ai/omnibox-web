import * as React from 'react';

import { preventNonPrimaryPointerUp } from '@/components/preventNonPrimaryPointerUp';
import {
  ContextMenuContent as UiContextMenuContent,
  ContextMenuSubContent as UiContextMenuSubContent,
} from '@/components/ui/ContextMenu';

type ContentElement = React.ElementRef<typeof UiContextMenuContent>;
type ContentProps = React.ComponentPropsWithoutRef<typeof UiContextMenuContent>;
type SubContentElement = React.ElementRef<typeof UiContextMenuSubContent>;
type SubContentProps = React.ComponentPropsWithoutRef<
  typeof UiContextMenuSubContent
>;

function mergePointerUpCapture<T extends HTMLElement>(
  onPointerUpCapture?: React.PointerEventHandler<T>
): React.PointerEventHandler<T> {
  return event => {
    preventNonPrimaryPointerUp(event);
    onPointerUpCapture?.(event);
  };
}

export const ContextMenuContent = React.forwardRef<
  ContentElement,
  ContentProps
>(({ onPointerUpCapture, ...props }, ref) => (
  <UiContextMenuContent
    {...props}
    ref={ref}
    onPointerUpCapture={mergePointerUpCapture(onPointerUpCapture)}
  />
));
ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuSubContent = React.forwardRef<
  SubContentElement,
  SubContentProps
>(({ onPointerUpCapture, ...props }, ref) => (
  <UiContextMenuSubContent
    {...props}
    ref={ref}
    onPointerUpCapture={mergePointerUpCapture(onPointerUpCapture)}
  />
));
ContextMenuSubContent.displayName = 'ContextMenuSubContent';
