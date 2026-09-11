import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import type { ResourceCommentThread } from '@/interface';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

export interface CommentFocusOptions {
  align?: 'start';
  onLocated?: () => void;
}

interface UseCommentLinkNavigationOptions {
  enabled: boolean;
  loading: boolean;
  resourceId: string;
  editorReady: boolean;
  activeThreadId: string | null;
  threads: ResourceCommentThread[];
  openThread: (threadId: string) => void;
  focusThread: (threadId: string, options?: CommentFocusOptions) => void;
}

export function useCommentLinkNavigation({
  enabled,
  loading,
  resourceId,
  editorReady,
  activeThreadId,
  threads,
  openThread,
  focusThread,
}: UseCommentLinkNavigationOptions): void {
  const location = useLocation();
  const panel = useResourceCommentsPanel();
  const handledLinkRef = useRef<string | null>(null);
  const focusThreadRef = useRef(focusThread);
  focusThreadRef.current = focusThread;
  const threadId = /^#comment-(.+)$/.exec(location.hash)?.[1];
  const target = threads.find(thread => thread.id === threadId);
  const targetId = target?.id;
  const linkKey = `${resourceId}:${location.key}:${location.hash}`;
  const root = panel?.rootElement;
  const panelElement = panel?.panelElement;
  const panelOpen = panel?.panelOpen;

  useEffect(() => {
    handledLinkRef.current = null;
  }, [linkKey]);

  useEffect(() => {
    if (
      !enabled ||
      loading ||
      !targetId ||
      handledLinkRef.current === linkKey
    ) {
      return;
    }
    openThread(targetId);
  }, [enabled, loading, targetId, linkKey, openThread]);

  useEffect(() => {
    if (
      !enabled ||
      loading ||
      !targetId ||
      !editorReady ||
      activeThreadId !== targetId ||
      !root ||
      !panelElement ||
      !panelOpen ||
      handledLinkRef.current === linkKey
    ) {
      return;
    }

    let frame = 0;
    let previousBounds = '';
    let stableFrames = 0;
    let navigationStarted = false;
    let navigationFinished = false;
    const startedAt = performance.now();
    const navigate = (now: number) => {
      const card = Array.from(
        panelElement.querySelectorAll<HTMLElement>('[data-thread-id]')
      ).find(element => element.dataset.threadId === targetId);
      const scroll = panelElement.querySelector<HTMLElement>(
        '[data-comments-scroll]'
      );
      const markers = Array.from(
        root.querySelectorAll<HTMLElement>('[data-resource-comment-thread]')
      ).filter(element => element.dataset.resourceCommentThread === targetId);
      const marker = markers[0];
      if (card && scroll && card.parentElement?.style.visibility !== 'hidden') {
        const rect = card.getBoundingClientRect();
        const bounds = `${rect.top}:${rect.left}:${rect.width}:${marker?.getBoundingClientRect().top}`;
        stableFrames = bounds === previousBounds ? stableFrames + 1 : 0;
        previousBounds = bounds;
        // Wait for the editor anchors and panel transition before starting navigation.
        if (
          !navigationStarted &&
          stableFrames >= 3 &&
          (marker ||
            target?.resolved ||
            target?.anchor.status === 'orphaned' ||
            now - startedAt >= 1000)
        ) {
          navigationStarted = true;
          focusThreadRef.current(targetId, {
            onLocated: () => {
              navigationFinished = true;
            },
          });
          stableFrames = 0;
        } else if (navigationFinished && stableFrames >= 3) {
          const viewport = scroll.getBoundingClientRect();
          if (rect.top < viewport.top || rect.bottom > viewport.bottom) {
            scroll.scrollTop += rect.top - viewport.top - 12;
          }
          handledLinkRef.current = linkKey;
          return;
        }
      }
      frame = requestAnimationFrame(navigate);
    };
    frame = requestAnimationFrame(navigate);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    enabled,
    loading,
    targetId,
    target?.resolved,
    target?.anchor.status,
    linkKey,
    editorReady,
    activeThreadId,
    root,
    panelElement,
    panelOpen,
  ]);
}
