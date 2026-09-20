import * as React from 'react';

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
    // Right-click uses button 2. macOS Control+click still reports button 0.
    if (event.button !== 0 || event.ctrlKey) {
      event.preventDefault();
    }
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
