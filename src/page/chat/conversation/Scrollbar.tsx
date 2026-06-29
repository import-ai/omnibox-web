import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

interface IProps {
  children: React.ReactNode;
}

const bottomThreshold = 200;

export default function Scrollbar(props: IProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const updateScrollToBottomVisible = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const distanceToBottom =
      root.scrollHeight - root.scrollTop - root.clientHeight;
    setShowScrollToBottom(distanceToBottom > bottomThreshold);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.scrollTo({ top: root.scrollHeight, behavior });
    setShowScrollToBottom(false);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    if (!root || !container) {
      return;
    }

    const stickToBottom = () => {
      if (
        root.scrollHeight - root.scrollTop - root.clientHeight <
        bottomThreshold
      ) {
        scrollToBottom();
      }
      updateScrollToBottomVisible();
    };

    const observer = new ResizeObserver(() => {
      stickToBottom();
    });
    observer.observe(container);
    stickToBottom();
    root.addEventListener('scroll', updateScrollToBottomVisible);
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', updateScrollToBottomVisible);
    };
  }, [scrollToBottom, updateScrollToBottomVisible]);

  return (
    <div className="relative flex shrink grow min-h-0">
      <div
        ref={rootRef}
        className="flex shrink grow justify-center p-4 w-full min-h-0 overflow-y-auto [scrollbar-gutter:stable_both-edges]"
      >
        <div ref={containerRef} className="max-w-3xl w-full h-fit">
          {props.children}
        </div>
      </div>
      {showScrollToBottom && (
        <Button
          aria-label="回到底部"
          className="absolute bottom-4 right-6 rounded-full bg-background/95 text-foreground shadow-md backdrop-blur hover:bg-accent hover:text-accent-foreground"
          onClick={() => scrollToBottom('smooth')}
          size="icon"
          title="回到底部"
          type="button"
          variant="outline"
        >
          <ArrowDown />
        </Button>
      )}
    </div>
  );
}
