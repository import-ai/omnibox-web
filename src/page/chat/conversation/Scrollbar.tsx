import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface IProps {
  children: React.ReactNode;
}

const showButtonThreshold = 24;
const stickToBottomThreshold = 200;

export default function Scrollbar(props: IProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollToBottomLabel = t('chat.messages.actions.scroll_to_bottom');

  const updateScrollToBottomVisible = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const distanceToBottom =
      root.scrollHeight - root.scrollTop - root.clientHeight;
    setShowScrollToBottom(distanceToBottom > showButtonThreshold);
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
        stickToBottomThreshold
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
      <Button
        aria-hidden={!showScrollToBottom}
        aria-label={scrollToBottomLabel}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-white text-foreground opacity-0 shadow-none transition-opacity duration-200 hover:bg-accent hover:text-accent-foreground dark:bg-background dark:hover:bg-accent',
          showScrollToBottom
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none'
        )}
        onClick={() => scrollToBottom('smooth')}
        size="icon"
        tabIndex={showScrollToBottom ? 0 : -1}
        title={scrollToBottomLabel}
        type="button"
        variant="ghost"
      >
        <ArrowDown />
      </Button>
    </div>
  );
}
