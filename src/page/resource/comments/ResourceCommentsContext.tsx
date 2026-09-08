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

const COMMENTS_PANEL_STORAGE_KEY = 'resource-comments-panel';

function readStoredPanelOpen(namespaceId: string) {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    const raw = sessionStorage.getItem(COMMENTS_PANEL_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[namespaceId] === true;
  } catch {
    return false;
  }
}

function writeStoredPanelOpen(namespaceId: string, open: boolean) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    const raw = sessionStorage.getItem(COMMENTS_PANEL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    if (open) {
      parsed[namespaceId] = true;
    } else {
      delete parsed[namespaceId];
    }
    sessionStorage.setItem(COMMENTS_PANEL_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures; the panel still works in-memory.
  }
}

interface ResourceCommentsPanelContext {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  panelElement: HTMLDivElement | null;
  setPanelElement: (element: HTMLDivElement | null) => void;
  rootElement: HTMLDivElement | null;
  namespaceId: string;
  commentFocusOffset: number;
  setCommentFocusOffset: (offset: number, animate?: boolean) => void;
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
  const [panelOpen, setOpen] = useState(() => readStoredPanelOpen(namespaceId));
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);
  const [rootElement, setRootElementState] = useState<HTMLDivElement | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const [commentFocusOffset, setCommentFocusOffsetState] = useState(0);
  const shiftRef = useRef(0);
  const writeShift = useCallback((value: number, animate: boolean) => {
    const list = rootRef.current?.querySelector<HTMLElement>(
      '.resource-comments-anchored-list'
    );
    if (list) {
      list.style.transition = animate ? 'transform 180ms ease' : 'none';
    }
    rootRef.current?.style.setProperty(
      '--resource-comment-shift',
      `${value}px`
    );
  }, []);
  const applyShift = useCallback(
    (next: number, animate: boolean) => {
      shiftRef.current = next;
      writeShift(next, animate);
    },
    [writeShift]
  );
  const setCommentFocusOffset = useCallback(
    (offset: number, animate = true) => {
      applyShift(offset, animate);
      setCommentFocusOffsetState(offset);
    },
    [applyShift]
  );
  const setRootElement = useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element;
    setRootElementState(element);
  }, []);
  const setPanelOpen = useCallback(
    (open: boolean) => {
      if (!namespaceId.startsWith('share:')) {
        const copilot = useCopilotStore.getState();
        if (open) {
          copilot.open(namespaceId);
        } else {
          copilot.close(namespaceId);
        }
      }
      writeStoredPanelOpen(namespaceId, open);
      if (!open) {
        applyShift(0, false);
        setCommentFocusOffsetState(0);
      }
      setOpen(open);
    },
    [applyShift, namespaceId]
  );

  useEffect(() => {
    const storedOpen = readStoredPanelOpen(namespaceId);
    setOpen(storedOpen);
    if (storedOpen && !namespaceId.startsWith('share:')) {
      useCopilotStore.getState().open(namespaceId);
    }
  }, [namespaceId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !panelOpen) {
      return;
    }
    const resourceScroll = root.querySelector<HTMLElement>(
      '[data-resource-scroll]'
    );
    if (!resourceScroll) {
      return;
    }

    const scrollByClamped = (element: HTMLElement, delta: number) => {
      const before = element.scrollTop;
      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      element.scrollTop = Math.min(max, Math.max(0, before + delta));
      return element.scrollTop - before;
    };

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const overComments = Boolean(target.closest('[data-comments-scroll]'));
      const overDocument = Boolean(target.closest('[data-resource-scroll]'));
      if (!overComments && !overDocument) {
        return;
      }
      const commentsScroll =
        panelElement?.querySelector<HTMLElement>('[data-comments-scroll]') ??
        root.querySelector<HTMLElement>('[data-comments-scroll]');
      const commentsOverflow = commentsScroll?.scrollTop ?? 0;

      if (overComments) {
        event.preventDefault();
        let remaining = event.deltaY;
        if (commentsScroll && commentsOverflow > 0 && remaining < 0) {
          remaining -= scrollByClamped(commentsScroll, remaining);
        }
        if (remaining !== 0) {
          remaining -= scrollByClamped(resourceScroll, remaining);
        }
        if (remaining !== 0 && commentsScroll) {
          scrollByClamped(commentsScroll, remaining);
        }
        return;
      }

      if (
        resourceScroll.scrollTop <= 0 &&
        event.deltaY < 0 &&
        commentsOverflow > 0 &&
        commentsScroll
      ) {
        event.preventDefault();
        scrollByClamped(commentsScroll, event.deltaY);
      }
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      root.removeEventListener('wheel', onWheel);
    };
  }, [panelOpen, panelElement]);

  const value = {
    panelOpen,
    setPanelOpen,
    panelElement,
    setPanelElement,
    rootElement,
    namespaceId,
    commentFocusOffset,
    setCommentFocusOffset,
  };

  return (
    <CommentsContext.Provider value={value}>
      <div
        ref={setRootElement}
        data-resource-comments-root
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
