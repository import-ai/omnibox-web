import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import type { ResourceCommentThread } from '@/interface';

import { commentThreadIds } from './imageCommentMarks';
import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import type { ResourceCommentsController } from './useResourceComments';
import { useSelectedImageCommentThreads } from './useSelectedImageCommentThreads';

const COMMENT_GAP = 8;
const DEFAULT_COMMENT_HEIGHT = 120;
// Local window only. "Load more" reveals the next document-ordered slice
// already held in memory. It does not call the comment list API.
const VISIBLE_PAGE_SIZE = 20;

interface ResourceCommentThreadListProps {
  controller: ResourceCommentsController;
  onDocumentOrder?: (threadIds: string[]) => void;
}

export function ResourceCommentThreadList({
  controller,
  onDocumentOrder,
}: ResourceCommentThreadListProps) {
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  const root = panel?.rootElement;
  const panelElement = panel?.panelElement;
  const panelOpen = panel?.panelOpen;
  const highlightedImageThreads = useSelectedImageCommentThreads(
    controller.editor
  );
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [contentHeight, setContentHeight] = useState(0);
  const [orderedThreadIds, setOrderedThreadIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_PAGE_SIZE);
  const navigatingThreadIdRef = useRef(controller.navigatingThreadId);
  const onDocumentOrderRef = useRef(onDocumentOrder);
  const reportedOrderRef = useRef<string[]>([]);
  const orphanLayoutAllowedRef = useRef(false);
  navigatingThreadIdRef.current = controller.navigatingThreadId;
  onDocumentOrderRef.current = onDocumentOrder;

  useLayoutEffect(() => {
    if (!root || !panelElement || !panelOpen) {
      return;
    }

    let frame = 0;
    const previousMarkerPositions = new Map<string, number>();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const update = () => {
      const resourceScroll = root.querySelector<HTMLElement>(
        '[data-resource-scroll]'
      );
      const commentsScroll = panelElement.querySelector<HTMLElement>(
        '[data-comments-scroll]'
      );
      if (!resourceScroll || !commentsScroll) {
        return;
      }

      const commentsRect = commentsScroll.getBoundingClientRect();
      const markers = new Map<string, HTMLElement>();
      root
        .querySelectorAll<HTMLElement>('[data-resource-comment-thread]')
        .forEach(marker => {
          for (const threadId of commentThreadIds(marker)) {
            if (!markers.has(threadId)) {
              markers.set(threadId, marker);
            }
          }
        });

      const threadElements = new Map<string, HTMLElement>();
      commentsScroll
        .querySelectorAll<HTMLElement>('[data-thread-id]')
        .forEach(threadElement => {
          const threadId = threadElement.dataset.threadId;
          if (threadId && !threadElements.has(threadId)) {
            threadElements.set(threadId, threadElement);
          }
        });

      const markerOrder = [...markers.keys()];
      const anchoredThreads = controller.threads
        .map((thread, index) => {
          const marker = markers.get(thread.id);
          const documentIndex = markerOrder.indexOf(thread.id);
          const position = marker
            ? marker.getBoundingClientRect().top - commentsRect.top
            : (previousMarkerPositions.get(thread.id) ?? Number.NaN);
          const element = threadElements.get(thread.id);
          const height =
            element?.getBoundingClientRect().height || DEFAULT_COMMENT_HEIGHT;
          return { thread, documentIndex, index, position, height };
        })
        .sort((left, right) => {
          const leftHasMarker = Number.isFinite(left.position);
          const rightHasMarker = Number.isFinite(right.position);
          if (leftHasMarker && rightHasMarker) {
            const positionDifference = left.position - right.position;
            if (Math.abs(positionDifference) > 1) {
              return positionDifference;
            }
            return (
              Date.parse(left.thread.created_at) -
                Date.parse(right.thread.created_at) ||
              left.documentIndex - right.documentIndex ||
              left.thread.id.localeCompare(right.thread.id)
            );
          }
          if (leftHasMarker !== rightHasMarker) {
            return leftHasMarker ? -1 : 1;
          }
          if (left.documentIndex !== -1 && right.documentIndex !== -1) {
            return left.documentIndex - right.documentIndex;
          }
          return left.index - right.index;
        });

      const documentOrder = anchoredThreads;
      const layoutThreads = documentOrder.slice(0, visibleCount);
      const hasMeasuredMarker = layoutThreads.some(item =>
        Number.isFinite(item.position)
      );
      // Before anchors exist, a missing marker is not an orphan: stacking those
      // cards at the top makes them flash there and then jump beside the text.
      if (controller.threads.length > 0 && !hasMeasuredMarker) {
        const anchorsReady = Boolean(
          root.querySelector('[data-comment-anchors-ready]')
        );
        if (!anchorsReady || !orphanLayoutAllowedRef.current) {
          orphanLayoutAllowedRef.current = anchorsReady;
          setPositions(current =>
            Object.keys(current).length === 0 ? current : {}
          );
          if (anchorsReady) {
            schedule();
          }
          return;
        }
      } else {
        orphanLayoutAllowedRef.current = false;
      }
      const nextPositions: Record<string, number> = {};
      let previousBottom = -Infinity;
      layoutThreads.forEach(({ thread, position, height }) => {
        const preferredPosition = Number.isFinite(position)
          ? position
          : previousBottom === -Infinity
            ? 0
            : previousBottom + COMMENT_GAP;
        const nextPosition = Math.max(
          preferredPosition,
          previousBottom === -Infinity
            ? preferredPosition
            : previousBottom + COMMENT_GAP
        );
        nextPositions[thread.id] = nextPosition;
        previousBottom = nextPosition + height;
      });

      // Keep the selected card in place when nearby reply composers resize.
      const selectedIndex = layoutThreads.findIndex(({ thread }) =>
        threadElements.get(thread.id)?.hasAttribute('data-selected')
      );
      const selected = layoutThreads[selectedIndex];
      if (selected && previousMarkerPositions.has(selected.thread.id)) {
        const element = threadElements.get(selected.thread.id);
        const wrapper = element?.parentElement;
        const previousMarker = previousMarkerPositions.get(selected.thread.id);
        const markerDelta =
          navigatingThreadIdRef.current !== selected.thread.id &&
          Number.isFinite(selected.position) &&
          previousMarker !== undefined &&
          Number.isFinite(previousMarker)
            ? selected.position - previousMarker
            : 0;
        if (wrapper) {
          // offsetTop rounds subpixel positions and makes selection visibly jump.
          nextPositions[selected.thread.id] =
            parseFloat(wrapper.style.top) + markerDelta;
          for (let index = selectedIndex - 1; index >= 0; index -= 1) {
            const { thread, height, position } = layoutThreads[index];
            const next = layoutThreads[index + 1];
            const gap =
              Number.isFinite(position) && Number.isFinite(next.position)
                ? Math.max(COMMENT_GAP, next.position - position - height)
                : COMMENT_GAP;
            nextPositions[thread.id] =
              nextPositions[next.thread.id] - height - gap;
          }
          for (
            let index = selectedIndex + 1;
            index < layoutThreads.length;
            index += 1
          ) {
            const { thread } = layoutThreads[index];
            const previous = layoutThreads[index - 1];
            nextPositions[thread.id] = Math.max(
              nextPositions[thread.id],
              nextPositions[previous.thread.id] + previous.height + COMMENT_GAP
            );
          }
        }
      }
      documentOrder.forEach(({ thread, position }) => {
        previousMarkerPositions.set(thread.id, position);
      });
      const lastBottom = Math.max(
        0,
        ...layoutThreads.map(
          ({ thread, height }) => nextPositions[thread.id] + height
        )
      );
      const nextHeight = Math.max(
        commentsScroll.clientHeight,
        lastBottom + commentsScroll.clientHeight
      );
      setPositions(current =>
        arePositionsEqual(current, nextPositions) ? current : nextPositions
      );
      setContentHeight(current =>
        current === nextHeight ? current : nextHeight
      );
      const nextOrderedIds = documentOrder.map(({ thread }) => thread.id);
      setOrderedThreadIds(current =>
        areIdsEqual(current, nextOrderedIds) ? current : nextOrderedIds
      );
      if (!areIdsEqual(reportedOrderRef.current, nextOrderedIds)) {
        reportedOrderRef.current = nextOrderedIds;
        onDocumentOrderRef.current?.(nextOrderedIds);
      }
    };

    const onRootScroll = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-comments-scroll]')
      ) {
        return;
      }
      schedule();
    };

    schedule();
    root.addEventListener('scroll', onRootScroll, true);
    window.addEventListener('resize', schedule);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    const resourceScroll = root.querySelector<HTMLElement>(
      '[data-resource-scroll]'
    );
    const commentsScroll = panelElement.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    );
    if (resizeObserver) {
      resizeObserver.observe(root);
      if (resourceScroll) {
        resizeObserver.observe(resourceScroll);
      }
      if (commentsScroll) {
        commentsScroll
          .querySelectorAll<HTMLElement>('[data-thread-id]')
          .forEach(threadElement => resizeObserver.observe(threadElement));
      }
    }
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(schedule);
    if (mutationObserver && resourceScroll) {
      mutationObserver.observe(resourceScroll, {
        attributes: true,
        attributeFilter: ['data-comment-anchors-ready'],
        childList: true,
        subtree: true,
      });
    }
    if (mutationObserver && commentsScroll) {
      mutationObserver.observe(commentsScroll, {
        attributes: true,
        attributeFilter: ['data-resolved'],
        childList: true,
        subtree: true,
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onRootScroll, true);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [controller.threads, panelOpen, panelElement, root, visibleCount]);

  const resolvedFilter = controller.resolved;
  const activeThreadId = controller.activeThreadId;
  useEffect(() => {
    if (!activeThreadId) {
      return;
    }
    const index = orderedThreadIds.indexOf(activeThreadId);
    if (index >= visibleCount) {
      setVisibleCount(index + 1);
    }
  }, [activeThreadId, orderedThreadIds, visibleCount]);
  useEffect(() => {
    orphanLayoutAllowedRef.current = false;
    setPositions({});
    setOrderedThreadIds([]);
  }, [controller.resourceId]);
  useEffect(() => {
    setVisibleCount(VISIBLE_PAGE_SIZE);
  }, [controller.commentRefreshEpoch, controller.resourceId, resolvedFilter]);

  const threadsById = new Map(
    controller.threads.map(thread => [thread.id, thread])
  );
  const renderedThreads: ResourceCommentThread[] =
    orderedThreadIds.length > 0
      ? orderedThreadIds.slice(0, visibleCount).flatMap(threadId => {
          const thread = threadsById.get(threadId);
          return thread ? [thread] : [];
        })
      : controller.threads.length <= visibleCount
        ? controller.threads
        : [];
  const hasMore = orderedThreadIds.length > visibleCount;

  return (
    <div
      className="resource-comments-anchored-list relative"
      style={{
        minHeight: contentHeight,
        transform: 'translateY(var(--resource-comment-shift, 0px))',
      }}
    >
      {renderedThreads.map(thread => (
        <div
          key={thread.id}
          className="absolute inset-x-0"
          style={{
            top: positions[thread.id] ?? 0,
            visibility:
              positions[thread.id] === undefined ? 'hidden' : undefined,
          }}
        >
          <ResourceCommentThreadItem
            controller={controller}
            mode="all"
            orderedThreadIds={orderedThreadIds}
            thread={thread}
            imageHighlighted={highlightedImageThreads.includes(thread.id)}
          />
        </div>
      ))}
      {hasMore && (
        <div
          className="absolute inset-x-0 p-4"
          style={{ top: Math.max(0, contentHeight - 80) }}
        >
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              setVisibleCount(current => current + VISIBLE_PAGE_SIZE)
            }
          >
            {t('resource_comments.load_more')}
          </Button>
        </div>
      )}
    </div>
  );
}

function areIdsEqual(current: string[], next: string[]) {
  return (
    current.length === next.length &&
    current.every((threadId, index) => threadId === next[index])
  );
}

function arePositionsEqual(
  current: Record<string, number>,
  next: Record<string, number>
) {
  const currentIds = Object.keys(current);
  const nextIds = Object.keys(next);
  if (currentIds.length !== nextIds.length) {
    return false;
  }
  return nextIds.every(threadId => current[threadId] === next[threadId]);
}
