import { useLayoutEffect } from 'react';

interface UseCommentHighlightOptions {
  root: HTMLElement | null | undefined;
  activeThreadId: string | null;
  resolved: boolean;
}

const RESOLVED_HIGHLIGHT_DURATION_MS = 1000;

export function useCommentHighlight({
  root,
  activeThreadId,
  resolved,
}: UseCommentHighlightOptions): void {
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
    // Editor transactions may replace a quote's DOM while its comment stays selected.
    const observer = new MutationObserver(() => update());
    const update = () => {
      highlighted.forEach(quote => {
        if (
          !root.contains(quote) ||
          quote.dataset.resourceCommentThread !== activeThreadId
        ) {
          delete quote.dataset.commentHighlight;
          highlighted.delete(quote);
        }
      });
      root
        .querySelectorAll<HTMLElement>('[data-resource-comment-thread]')
        .forEach(quote => {
          if (quote.dataset.resourceCommentThread === activeThreadId) {
            quote.dataset.commentHighlight = resolved ? 'resolved' : 'open';
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
      attributeFilter: ['data-resource-comment-thread'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      clearHighlight();
    };
  }, [root, activeThreadId, resolved]);
}
