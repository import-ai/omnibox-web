import { useLayoutEffect } from 'react';

interface UseCommentHighlightOptions {
  root: HTMLElement | null | undefined;
  activeThreadId: string | null;
  resolved: boolean;
}

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
    };
    update();
    // Editor transactions may replace a quote's DOM while its comment stays selected.
    const observer = new MutationObserver(update);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-resource-comment-thread'],
    });
    return () => {
      observer.disconnect();
      highlighted.forEach(quote => {
        delete quote.dataset.commentHighlight;
      });
    };
  }, [root, activeThreadId, resolved]);
}
