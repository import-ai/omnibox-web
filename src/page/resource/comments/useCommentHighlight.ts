import { useEffect, useLayoutEffect } from 'react';

import { setActiveCommentHighlight } from './activeCommentHighlight';
import type { ResourceCommentEditor } from './commentAnchors';
import { elementHasCommentThread } from './imageCommentMarks';

interface UseCommentHighlightOptions {
  root: HTMLElement | null | undefined;
  editor?: ResourceCommentEditor | null;
  activeThreadId: string | null;
  resolved: boolean;
}

const RESOLVED_HIGHLIGHT_DURATION_MS = 1000;

export function useCommentHighlight({
  root,
  editor,
  activeThreadId,
  resolved,
}: UseCommentHighlightOptions): void {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    setActiveCommentHighlight(
      editor,
      activeThreadId ? { threadId: activeThreadId, resolved } : null
    );
    const timeout =
      activeThreadId && resolved
        ? setTimeout(
            () => setActiveCommentHighlight(editor, null),
            RESOLVED_HIGHLIGHT_DURATION_MS
          )
        : undefined;
    return () => {
      clearTimeout(timeout);
      setActiveCommentHighlight(editor, null);
    };
  }, [editor, activeThreadId, resolved]);

  useLayoutEffect(() => {
    if (!root || !activeThreadId) {
      return;
    }
    const highlighted = new Set<HTMLElement>();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const clearHighlight = () => {
      highlighted.forEach(quote => {
        delete quote.dataset.commentHighlight;
      });
      highlighted.clear();
    };
    // Non-editor renderers may replace a quote while its comment stays selected.
    const observer = new MutationObserver(() => update());
    const update = () => {
      highlighted.forEach(quote => {
        if (
          !root.contains(quote) ||
          !elementHasCommentThread(quote, activeThreadId)
        ) {
          delete quote.dataset.commentHighlight;
          highlighted.delete(quote);
        }
      });
      root
        .querySelectorAll<HTMLElement>('[data-resource-comment-thread]')
        .forEach(quote => {
          // Live editor DOM belongs to ProseMirror, including read-only views.
          // This fallback only paints content rendered outside an editor.
          if (
            !quote.closest('.ProseMirror') &&
            elementHasCommentThread(quote, activeThreadId)
          ) {
            const highlight = resolved ? 'resolved' : 'open';
            if (quote.dataset.commentHighlight !== highlight) {
              quote.dataset.commentHighlight = highlight;
            }
            highlighted.add(quote);
          }
        });
      if (resolved && highlighted.size > 0 && timeout === undefined) {
        timeout = setTimeout(() => {
          observer.disconnect();
          clearHighlight();
        }, RESOLVED_HIGHLIGHT_DURATION_MS);
      }
    };
    update();
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-resource-comment-thread',
        'data-resource-comment-threads',
      ],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      clearHighlight();
    };
  }, [root, activeThreadId, resolved]);
}
