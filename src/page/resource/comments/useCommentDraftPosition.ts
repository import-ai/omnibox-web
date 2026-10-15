import {
  findResourceCommentRange,
  type OmniboxEditorCommentSelection,
} from '@import-ai/omnibox-editor';
import { type RefObject, useLayoutEffect, useState } from 'react';

import {
  getCommentDraftPosition,
  getVisibleCommentAnchorTop,
} from './commentDraftPosition';
import { getImageCommentRange } from './imageCommentMarks';
import { useResourceCommentsPanel } from './ResourceCommentsContext';

interface UseCommentDraftPositionOptions {
  selection: OmniboxEditorCommentSelection | null;
  surfaceRef: RefObject<HTMLElement | null>;
}

export function useCommentDraftPosition({
  selection,
  surfaceRef,
}: UseCommentDraftPositionOptions): number | null {
  const panel = useResourceCommentsPanel();
  const panelElement = panel?.panelElement;
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!selection || !panelElement || !surface) {
      setTop(null);
      return;
    }
    let frame = 0;
    const appliedOffsets = new Map<HTMLElement, number>();
    const resizeObserver = new ResizeObserver(() => schedule());
    const update = () => {
      if (selection.editor.isDestroyed) {
        return;
      }
      const panelTop = panelElement.getBoundingClientRect().top;
      const resourceScroll = selection.editor.view.dom.closest<HTMLElement>(
        '[data-resource-scroll]'
      );
      const viewport = resourceScroll?.getBoundingClientRect();
      const selectionTop = getVisibleCommentAnchorTop({
        isImage: isImageCommentRange(
          selection.editor,
          selection.from,
          selection.to
        ),
        startTop: selection.editor.view.coordsAtPos(selection.from).top,
        endTop: selection.editor.view.coordsAtPos(selection.to).top,
        viewportTop: viewport?.top ?? 0,
        viewportBottom: viewport?.bottom ?? window.innerHeight,
        surfaceHeight: surface.getBoundingClientRect().height,
      });
      const elements = Array.from(
        panelElement.querySelectorAll<HTMLElement>('[data-thread-id]')
      );
      const cards = elements.map(card => {
        resizeObserver.observe(card);
        const bounds = card.getBoundingClientRect();
        const threadId = card.dataset.threadId;
        const offset = appliedOffsets.get(card) ?? 0;
        const range = threadId
          ? (getImageCommentRange(selection.editor, threadId) ??
            findResourceCommentRange(selection.editor, threadId))
          : null;
        return {
          range,
          anchorTop: range
            ? selection.editor.view.coordsAtPos(
                isImageCommentRange(selection.editor, range.from, range.to)
                  ? range.from
                  : range.to
              ).top
            : undefined,
          top: bounds.top - offset,
          bottom: bounds.bottom - offset,
        };
      });
      const scroll = panelElement.querySelector('[data-comments-scroll]');
      const visibleTop = scroll?.getBoundingClientRect().top ?? panelTop;
      const position = getCommentDraftPosition(
        selection,
        Math.max(selectionTop, visibleTop),
        cards,
        surface.getBoundingClientRect().height
      );
      elements.forEach((card, index) => {
        const offset = position.cardOffsets[index];
        if (Math.abs(offset - (appliedOffsets.get(card) ?? 0)) > 0.1) {
          card.style.setProperty(
            '--resource-comment-draft-offset',
            `${offset}px`
          );
          appliedOffsets.set(card, offset);
        }
      });
      setTop(position.top - panelTop);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // The list positions cards in its own animation frame after a selection.
    const observer = new MutationObserver(records => {
      if (records.some(record => !surface.contains(record.target))) {
        schedule();
      }
    });
    observer.observe(panelElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true,
    });
    resizeObserver.observe(panelElement);
    resizeObserver.observe(surface);
    resizeObserver.observe(selection.editor.view.dom);
    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      appliedOffsets.forEach((_, card) => {
        card.style.removeProperty('--resource-comment-draft-offset');
      });
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [panelElement, selection, surfaceRef]);

  return top;
}

function isImageCommentRange(
  editor: OmniboxEditorCommentSelection['editor'],
  from: number,
  to: number
) {
  const node = editor.state.doc.nodeAt(from);
  return Boolean(
    node && node.type.name === 'image' && to === from + node.nodeSize
  );
}
