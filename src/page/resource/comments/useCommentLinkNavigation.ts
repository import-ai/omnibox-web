import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import type { ResourceCommentThread } from '@/interface';
import { getResourceCommentThread } from '@/service/resourceComments';

import { isDocumentCommentThread } from './documentCommentThreads';
import { elementHasCommentThread } from './imageCommentMarks';
import { useResourceCommentsPanel } from './ResourceCommentsContext';

export interface CommentFocusOptions {
  align?: 'start';
  centerResolvedDocumentComment?: boolean;
  openReply?: boolean;
  onLocated?: () => void;
  onFinished?: (result: 'located' | 'timeout' | 'cancelled') => void;
}

interface UseCommentLinkNavigationOptions {
  enabled: boolean;
  loading: boolean;
  resourceId: string;
  namespaceId?: string;
  getTargetVersion?: (threadId: string) => number;
  onTarget?: (
    thread: ResourceCommentThread,
    requestVersion: number
  ) => ResourceCommentThread | null;
  onUnavailable?: (threadId: string, requestVersion: number) => void;
  editorReady: boolean;
  activeThreadId: string | null;
  threads: ResourceCommentThread[];
  openThread: (threadId: string) => void;
  focusThread: (
    threadId: string,
    options?: CommentFocusOptions
  ) => void | (() => void);
}

export function useCommentLinkNavigation({
  enabled,
  loading,
  resourceId,
  namespaceId,
  onTarget,
  onUnavailable,
  getTargetVersion,
  editorReady,
  activeThreadId,
  threads,
  openThread,
  focusThread,
}: UseCommentLinkNavigationOptions): void {
  const location = useLocation();
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  const handledLinkRef = useRef<string | null>(null);
  const focusThreadRef = useRef(focusThread);
  focusThreadRef.current = focusThread;
  const onTargetRef = useRef(onTarget);
  onTargetRef.current = onTarget;
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const getTargetVersionRef = useRef(getTargetVersion);
  getTargetVersionRef.current = getTargetVersion;
  const translateRef = useRef(t);
  translateRef.current = t;
  const [lookup, setLookup] = useState<{
    key: string;
    thread: ResourceCommentThread | null;
  } | null>(null);
  const threadId = /^#comment-(.+)$/.exec(location.hash)?.[1];
  const requestKey = `${namespaceId}:${resourceId}:${location.key}:${location.hash}`;
  const target =
    lookup?.key === requestKey
      ? lookup.thread
        ? (threads.find(thread => thread.id === threadId) ??
          (onTarget ? null : lookup.thread))
        : null
      : namespaceId
        ? null
        : threads.find(thread => thread.id === threadId);
  const targetId = target?.id;
  const documentTarget = !!target && isDocumentCommentThread(target);
  const linkKey = requestKey;
  const root = panel?.rootElement;
  const panelElement = panel?.panelElement;
  const panelOpen = panel?.panelOpen;

  useEffect(() => {
    if (!enabled || !namespaceId || !threadId) return;
    let canceled = false;
    const requestVersion = getTargetVersionRef.current?.(threadId) ?? 0;
    getResourceCommentThread(namespaceId, resourceId, threadId)
      .then(thread => {
        if (canceled) return;
        const accepted = onTargetRef.current
          ? onTargetRef.current(thread, requestVersion)
          : thread;
        setLookup({ key: requestKey, thread: accepted });
      })
      .catch(error => {
        if (
          canceled ||
          (getTargetVersionRef.current?.(threadId) ?? 0) !== requestVersion
        )
          return;
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 403 || error.response?.status === 404)
        ) {
          onUnavailableRef.current?.(threadId, requestVersion);
        }
        setLookup({ key: requestKey, thread: null });
        toast.error(
          translateRef.current('resource_comments.comment_unavailable')
        );
      });
    return () => {
      canceled = true;
    };
  }, [enabled, namespaceId, resourceId, threadId, requestKey]);

  useEffect(() => {
    handledLinkRef.current = null;
  }, [linkKey]);

  useEffect(() => {
    if (
      !enabled ||
      (loading && !documentTarget) ||
      !targetId ||
      handledLinkRef.current === linkKey
    ) {
      return;
    }
    openThread(targetId);
  }, [enabled, loading, targetId, linkKey, openThread, documentTarget]);

  useEffect(() => {
    if (
      !enabled ||
      !documentTarget ||
      !targetId ||
      activeThreadId !== targetId ||
      handledLinkRef.current === linkKey ||
      !root
    )
      return;
    if (target.resolved && (!panelElement || !panelOpen)) return;
    const cancel = focusThreadRef.current(targetId, {
      openReply: false,
      centerResolvedDocumentComment: target.resolved,
      onFinished: () => {
        handledLinkRef.current = linkKey;
      },
    });
    return () => {
      cancel?.();
      handledLinkRef.current = linkKey;
    };
  }, [
    enabled,
    documentTarget,
    targetId,
    target?.resolved,
    activeThreadId,
    linkKey,
    root,
    panelElement,
    panelOpen,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      documentTarget ||
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
      ).filter(element => elementHasCommentThread(element, targetId));
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
            target?.anchor?.status === 'orphaned' ||
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
      if (now - startedAt >= 5000) {
        handledLinkRef.current = linkKey;
        return;
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
    target?.anchor?.status,
    documentTarget,
    linkKey,
    editorReady,
    activeThreadId,
    root,
    panelElement,
    panelOpen,
  ]);
}
