import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';
import { useCopilotStore } from '@/page/copilot/copilotStore';

interface ResourceCommentsPanelContext {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  panelElement: HTMLDivElement | null;
  setPanelElement: (element: HTMLDivElement | null) => void;
  namespaceId: string;
}

const CommentsContext = createContext<ResourceCommentsPanelContext | null>(
  null
);

export function useResourceCommentsPanel() {
  return useContext(CommentsContext);
}

export function ResourceCommentsProvider({
  children,
  namespaceId,
}: {
  children: ReactNode;
  namespaceId: string;
}) {
  const [panelOpen, setOpen] = useState(false);
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const setPanelOpen = useCallback(
    (open: boolean) => {
      if (open && !namespaceId.startsWith('share:')) {
        useCopilotStore.getState().open(namespaceId);
      }
      setOpen(open);
    },
    [namespaceId]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !panelOpen) {
      return;
    }
    let frame = 0;
    let source: Element | null = null;
    const syncScroll = (event: Event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        !target.matches('[data-resource-scroll], [data-comments-scroll]')
      ) {
        return;
      }
      if (source && source !== target) {
        return;
      }
      const other = root.querySelector<HTMLElement>(
        target.hasAttribute('data-resource-scroll')
          ? '[data-comments-scroll]'
          : '[data-resource-scroll]'
      );
      const range = target.scrollHeight - target.clientHeight;
      if (!other || range <= 0) {
        return;
      }
      source = target;
      other.scrollTop =
        (target.scrollTop / range) *
        Math.max(0, other.scrollHeight - other.clientHeight);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        source = null;
      });
    };
    root.addEventListener('scroll', syncScroll, true);
    return () => {
      root.removeEventListener('scroll', syncScroll, true);
      cancelAnimationFrame(frame);
    };
  }, [panelOpen]);

  const value = {
    panelOpen,
    setPanelOpen,
    panelElement,
    setPanelElement,
    namespaceId,
  };

  return (
    <CommentsContext.Provider value={value}>
      <div
        ref={rootRef}
        className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        {namespaceId.startsWith('share:') && (
          <div
            ref={setPanelElement}
            className={cn(
              'resource-comments-panel flex min-h-0 flex-col border-l bg-white text-foreground dark:bg-background',
              panelOpen
                ? 'absolute inset-0 z-30 md:static md:z-auto md:w-96 md:shrink-0'
                : 'hidden'
            )}
          />
        )}
      </div>
    </CommentsContext.Provider>
  );
}
