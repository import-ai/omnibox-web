import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollRequest {
  itemId?: string;
  enabled: boolean;
}

export function useRssItemAutoScroll(
  activeItemId: string | undefined,
  itemRendered: boolean
) {
  const location = useLocation();
  const requestRef = useRef<ScrollRequest>({ enabled: false });

  useLayoutEffect(() => {
    if (requestRef.current.itemId === activeItemId) return;

    requestRef.current = {
      itemId: activeItemId,
      enabled: Boolean(activeItemId) && location.state?.fromSidebar !== true,
    };
  }, [activeItemId, location.state?.fromSidebar]);

  useEffect(() => {
    if (!activeItemId || !itemRendered || !requestRef.current.enabled) return;

    const animationFrame = requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-rss-item-id="${activeItemId}"]`
      );
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestRef.current.enabled = false;
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [activeItemId, itemRendered]);
}
