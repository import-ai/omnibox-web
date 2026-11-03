import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResourceCommentThread } from '@/interface';

import { isDocumentCommentThread } from './documentCommentThreads';
import { elementHasCommentThread } from './imageCommentMarks';
import { useResourceCommentsPanel } from './ResourceCommentsContext';
import type { CommentFocusOptions } from './useCommentLinkNavigation';

const ALIGNMENT_TOLERANCE = 0.1;
const VIEWPORT_MARGIN = 12;
const MAX_ALIGNMENT_FRAMES = 45;
const STABLE_ALIGNMENT_FRAMES = 3;
const DOCUMENT_NAVIGATION_TIMEOUT_MS = 5000;
const DOCUMENT_SCROLL_RETRY_MS = 200;

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
  openThread: (threadId: string) => void,
  getThread?: (threadId: string) => ResourceCommentThread | undefined
): {
  focusThread: (
    threadId: string,
    options?: CommentFocusOptions
  ) => void | (() => void);
  cancelNavigation: () => void;
  navigatingThreadId: string | null;
  navigatingReplyThreadId: string | null;
} {
  const panel = useResourceCommentsPanel();
  const frameRef = useRef(0);
  const versionRef = useRef(0);
  const cancelDocumentRef = useRef<(() => void) | null>(null);
  const [navigation, setNavigation] = useState<{
    threadId: string;
    openReply: boolean;
  } | null>(null);
  const navigatingThreadId = navigation?.threadId ?? null;
  const navigatingReplyThreadId = navigation?.openReply
    ? navigation.threadId
    : null;
  const cancelNavigation = useCallback(() => {
    versionRef.current += 1;
    cancelAnimationFrame(frameRef.current);
    const cancelDocument = cancelDocumentRef.current;
    cancelDocumentRef.current = null;
    cancelDocument?.();
    setNavigation(null);
  }, []);

  useEffect(() => cancelNavigation, [cancelNavigation, resourceId]);

  const focusThread = useCallback(
    (threadId: string, options?: CommentFocusOptions) => {
      cancelNavigation();
      openThread(threadId);
      const root = panel?.rootElement;
      const panelElement = panel?.panelElement;
      const thread = getThread?.(threadId);
      if (thread && isDocumentCommentThread(thread)) {
        const targetRoot = thread.resolved ? panelElement : root;
        const version = versionRef.current;
        const startedAt = performance.now();
        let boundaryScrollStarted = false;
        let previousSourceTop: number | undefined;
        let lastSourceMovementAt = startedAt;
        let requestedTop: number | undefined;
        let stableFrames = 0;
        let finished = false;
        const interruptionTargets = new Set(
          [root, panelElement].filter(
            element => element !== null && element !== undefined
          )
        );
        const onUserScroll = (event: Event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(
              '[data-resource-scroll], [data-comments-scroll]'
            )
          ) {
            cancelNavigation();
          }
        };
        const finish = (result: 'located' | 'timeout' | 'cancelled') => {
          if (finished) return;
          finished = true;
          for (const element of interruptionTargets) {
            element.removeEventListener('wheel', onUserScroll, true);
            element.removeEventListener('touchstart', onUserScroll, true);
          }
          if (versionRef.current === version) cancelDocumentRef.current = null;
          if (result === 'located') options?.onLocated?.();
          options?.onFinished?.(result);
        };
        cancelDocumentRef.current = () => finish('cancelled');
        for (const element of interruptionTargets) {
          element.addEventListener('wheel', onUserScroll, {
            passive: true,
            capture: true,
          });
          element.addEventListener('touchstart', onUserScroll, {
            passive: true,
            capture: true,
          });
        }
        const locate = (now: number) => {
          if (versionRef.current !== version) return;
          if (now - startedAt >= DOCUMENT_NAVIGATION_TIMEOUT_MS) {
            finish('timeout');
            return;
          }
          const boundary = thread.resolved
            ? root?.querySelector<HTMLElement>('[data-resource-body-end]')
            : null;
          const source = root?.querySelector<HTMLElement>(
            '[data-resource-scroll]'
          );
          if (boundary && source) {
            const bodyBounds = boundary.getBoundingClientRect();
            const viewport = source.getBoundingClientRect();
            if (source.scrollTop !== previousSourceTop) {
              previousSourceTop = source.scrollTop;
              lastSourceMovementAt = now;
            }
            if (
              bodyBounds.bottom < viewport.top ||
              bodyBounds.top > viewport.bottom
            ) {
              if (
                !boundaryScrollStarted ||
                now - lastSourceMovementAt >= DOCUMENT_SCROLL_RETRY_MS
              ) {
                boundary.scrollIntoView?.({
                  block: 'nearest',
                  behavior: 'smooth',
                });
                boundaryScrollStarted = true;
                lastSourceMovementAt = now;
              }
              frameRef.current = requestAnimationFrame(locate);
              return;
            }
            boundaryScrollStarted = false;
          }
          const selector = thread.resolved
            ? '[data-thread-id]'
            : '[data-document-comment-id]';
          const card = Array.from(
            targetRoot?.querySelectorAll<HTMLElement>(selector) ?? []
          ).find(
            element =>
              (thread.resolved
                ? element.dataset.threadId
                : element.dataset.documentCommentId) === threadId
          );
          if (card && card.parentElement?.style.visibility !== 'hidden') {
            if (options?.centerResolvedDocumentComment && thread.resolved) {
              const commentsScroll = panelElement?.querySelector<HTMLElement>(
                '[data-comments-scroll]'
              );
              if (commentsScroll) {
                const viewport = commentsScroll.getBoundingClientRect();
                const cardBounds = card.getBoundingClientRect();
                const maxScroll = Math.max(
                  0,
                  commentsScroll.scrollHeight - commentsScroll.clientHeight
                );
                const top = Math.min(
                  maxScroll,
                  Math.max(
                    0,
                    commentsScroll.scrollTop +
                      (cardBounds.height > viewport.height
                        ? cardBounds.top - viewport.top - VIEWPORT_MARGIN
                        : (cardBounds.top +
                            cardBounds.bottom -
                            viewport.top -
                            viewport.bottom) /
                          2)
                  )
                );
                if (
                  requestedTop === undefined ||
                  Math.abs(top - requestedTop) > 1
                ) {
                  requestedTop = top;
                  if (typeof commentsScroll.scrollTo === 'function') {
                    commentsScroll.scrollTo({ top, behavior: 'smooth' });
                  } else {
                    commentsScroll.scrollTop = top;
                  }
                }
                const currentBounds = card.getBoundingClientRect();
                const visible =
                  currentBounds.top >= viewport.top - 1 &&
                  (currentBounds.height > viewport.height
                    ? currentBounds.top <= viewport.top + VIEWPORT_MARGIN + 1
                    : currentBounds.bottom <= viewport.bottom + 1);
                const aligned =
                  visible && Math.abs(commentsScroll.scrollTop - top) <= 1;
                const imagesLoading = Array.from(
                  source?.querySelectorAll('img') ?? []
                ).some(image => !image.complete);
                stableFrames = aligned && !imagesLoading ? stableFrames + 1 : 0;
                if (stableFrames >= STABLE_ALIGNMENT_FRAMES) {
                  finish('located');
                  return;
                }
              }
            } else {
              card.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
              finish('located');
              return;
            }
          }
          frameRef.current = requestAnimationFrame(locate);
        };
        frameRef.current = requestAnimationFrame(locate);
        return () => {
          if (versionRef.current === version) cancelNavigation();
          finish('cancelled');
        };
      }
      if (!root || !panelElement || !panel) {
        return;
      }
      setNavigation({ threadId, openReply: options?.openReply ?? true });

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
        ).find(element => elementHasCommentThread(element, threadId));
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
          setNavigation(null);
          options?.onLocated?.();
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [cancelNavigation, openThread, panel, getThread]
  );

  return {
    focusThread,
    cancelNavigation,
    navigatingThreadId,
    navigatingReplyThreadId,
  };
}
