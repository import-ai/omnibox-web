import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { speechBubblePath } from './speechBubblePath';

interface SpeechBubbleShapeProps {
  compact?: boolean;
}

export default function SpeechBubbleShape({
  compact = false,
}: SpeechBubbleShapeProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const bounds = element.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);
      setSize(current =>
        current.width === width && current.height === height
          ? current
          : { width, height }
      );
    };

    update();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const path =
    size.width > 0 && size.height > 0
      ? speechBubblePath(size.width, size.height)
      : undefined;

  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={size.width > 0 ? `0 0 ${size.width} ${size.height}` : undefined}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      {path && (
        <path
          d={path}
          className={cn(
            'fill-chat-composer stroke-[#E5E5E5] dark:fill-chat-composer-dark dark:stroke-transparent',
            compact && 'opacity-80'
          )}
        />
      )}
    </svg>
  );
}
