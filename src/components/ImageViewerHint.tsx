import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

export function ImageViewerHint({
  label,
  children,
  onEscape,
}: {
  label: string;
  children: ReactElement;
  onEscape: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        collisionPadding={8}
        arrowClassName="fill-white"
        className="pointer-events-none z-[60] max-w-[calc(100vw-1rem)] bg-white text-neutral-900 shadow-md"
        onEscapeKeyDown={event => {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
