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
    if (!activeItemId) {
      requestRef.current = { enabled: false };
      return;
    }

    if (location.state?.fromSidebar === true) {
      requestRef.current = { itemId: activeItemId, enabled: false };
      return;
    }

    if (requestRef.current.itemId !== activeItemId) {
      requestRef.current = { itemId: activeItemId, enabled: true };
      return;
    }

    // Same item can unmount during toolbar/page refresh reloads. Re-enable so
    // the active entry is positioned again once it reappears.
    if (!itemRendered) {
      requestRef.current.enabled = true;
    }
  }, [activeItemId, itemRendered, location.state?.fromSidebar]);

  useEffect(() => {
    if (!activeItemId || !itemRendered || !requestRef.current.enabled) return;

    const animationFrame = requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-rss-item-id="${activeItemId}"]`
      );
      element?.scrollIntoView({ behavior: 'auto', block: 'center' });
      requestRef.current.enabled = false;
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [activeItemId, itemRendered]);
}
