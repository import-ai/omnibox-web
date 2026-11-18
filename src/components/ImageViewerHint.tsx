import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

export function ImageViewerHint({
  label,
  children,
  disabled,
  onEscape,
}: {
  label: string;
  children: ReactElement;
  disabled?: boolean;
  onEscape: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span
            tabIndex={0}
            role="group"
            aria-label={label}
            className="inline-flex cursor-not-allowed rounded-md focus-visible:outline-2 focus-visible:outline-white [&>button]:pointer-events-none"
          >
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipTrigger>
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
