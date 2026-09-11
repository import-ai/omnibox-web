import { useCallback, useEffect, useRef, useState } from 'react';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import type { CommentFocusOptions } from './useCommentLinkNavigation';

const ALIGNMENT_TOLERANCE = 0.1;
const VIEWPORT_MARGIN = 12;
const MAX_ALIGNMENT_FRAMES = 45;
const STABLE_ALIGNMENT_FRAMES = 3;

function getSourceScrollTarget(
  source: HTMLElement | null,
  marker: HTMLElement | undefined,
  commentsViewport: DOMRect,
  align?: 'start'
): number {
  if (!source || !marker) {
    return source?.scrollTop ?? 0;
  }
  const viewport = source.getBoundingClientRect();
  const quoteTop = marker.getBoundingClientRect().top;
  const visibleTop =
    Math.max(viewport.top, commentsViewport.top) + VIEWPORT_MARGIN;
  const visibleBottom =
    Math.min(viewport.bottom, commentsViewport.bottom) - VIEWPORT_MARGIN * 2;
  if (
    align !== 'start' &&
    quoteTop >= visibleTop &&
    quoteTop <= visibleBottom
  ) {
    return source.scrollTop;
  }
  return Math.min(
    Math.max(0, source.scrollHeight - source.clientHeight),
    Math.max(0, source.scrollTop + quoteTop - visibleTop - VIEWPORT_MARGIN)
  );
}

export function useCommentNavigation(
  resourceId: string,
  openThread: (threadId: string) => void
): {
  focusThread: (threadId: string, options?: CommentFocusOptions) => void;
  cancelNavigation: () => void;
  navigatingThreadId: string | null;
} {
  const panel = useResourceCommentsPanel();
  const frameRef = useRef(0);
  const [navigatingThreadId, setNavigatingThreadId] = useState<string | null>(
    null
  );
  const cancelNavigation = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    setNavigatingThreadId(null);
  }, []);

  useEffect(() => cancelNavigation, [cancelNavigation, resourceId]);

  const focusThread = useCallback(
    (threadId: string, options?: CommentFocusOptions) => {
      cancelNavigation();
      openThread(threadId);
      const root = panel?.rootElement;
      const panelElement = panel?.panelElement;
      if (!root || !panelElement || !panel) {
        return;
      }
      setNavigatingThreadId(threadId);

      let shift = panel.commentFocusOffset;
      let animation: {
        startedAt: number;
        duration: number;
        sourceStart: number;
        sourceEnd: number;
        initialGap: number;
      } | null = null;
      let attempts = 0;
      let stableFrames = 0;
      const tick = (now: number) => {
        const source = root.querySelector<HTMLElement>(
          '[data-resource-scroll]'
        );
        const scroll = panelElement.querySelector<HTMLElement>(
          '[data-comments-scroll]'
        );
        const card = Array.from(
          panelElement.querySelectorAll<HTMLElement>('[data-thread-id]')
        ).find(element => element.dataset.threadId === threadId);
        const marker = Array.from(
          root.querySelectorAll<HTMLElement>('[data-resource-comment-thread]')
        ).find(element => element.dataset.resourceCommentThread === threadId);
        attempts += 1;
        if (
          scroll &&
          card &&
          card.parentElement?.style.visibility !== 'hidden'
        ) {
          const viewport = scroll.getBoundingClientRect();
          const markerTop = marker?.getBoundingClientRect().top;
          const targetTop = markerTop ?? viewport.top + VIEWPORT_MARGIN;
          if (!animation) {
            const sourceStart = source?.scrollTop ?? 0;
            const sourceEnd = getSourceScrollTarget(
              source,
              marker,
              viewport,
              options?.align
            );
            const initialGap = card.getBoundingClientRect().top - targetTop;
            const distance = Math.max(
              Math.abs(sourceEnd - sourceStart),
              Math.abs(initialGap)
            );
            animation = {
              startedAt: now,
              duration: window.matchMedia?.('(prefers-reduced-motion: reduce)')
                .matches
                ? 0
                : Math.min(360, Math.max(180, distance * 0.4)),
              sourceStart,
              sourceEnd,
              initialGap,
            };
          }

          const progress =
            animation.duration === 0
              ? 1
              : Math.min(1, (now - animation.startedAt) / animation.duration);
          const eased = 1 - (1 - progress) ** 2;
          if (source && animation.sourceEnd !== animation.sourceStart) {
            source.scrollTop =
              animation.sourceStart +
              (animation.sourceEnd - animation.sourceStart) * eased;
          }
          const quoteTop = marker?.getBoundingClientRect().top ?? targetTop;
          const gap = card.getBoundingClientRect().top - quoteTop;
          const delta = gap - animation.initialGap * (1 - eased);
          const before = scroll.scrollTop;
          scroll.scrollTop = Math.min(
            Math.max(0, scroll.scrollHeight - scroll.clientHeight),
            Math.max(0, before + delta)
          );
          // A card above its quote cannot align by scrolling past the top edge.
          const remainder = delta - (scroll.scrollTop - before);
          if (Math.abs(remainder) > ALIGNMENT_TOLERANCE) {
            shift -= remainder;
            panel.setCommentFocusOffset(shift, false);
          }
          const aligned =
            progress === 1 &&
            Math.abs(card.getBoundingClientRect().top - quoteTop) <=
              ALIGNMENT_TOLERANCE;
          stableFrames = aligned ? stableFrames + 1 : 0;
        }

        if (
          stableFrames >= STABLE_ALIGNMENT_FRAMES ||
          attempts >= MAX_ALIGNMENT_FRAMES
        ) {
          setNavigatingThreadId(null);
          options?.onLocated?.();
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [cancelNavigation, openThread, panel]
  );

  return { focusThread, cancelNavigation, navigatingThreadId };
}
