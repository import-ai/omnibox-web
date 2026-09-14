import { type RefObject, useEffect, useState } from 'react';

export const COMPACT_RESOURCE_PANE_WIDTH = 768;

export function isFolderLikeResourceType(resourceType?: string | null) {
  return (
    resourceType === 'folder' ||
    resourceType === 'smart_folder' ||
    resourceType === 'rss_folder'
  );
}

export function shouldUseFullWidthResourcePane(
  useOmniboxEditor: boolean,
  resourceType?: string | null
) {
  return (
    useOmniboxEditor &&
    !!resourceType &&
    !isFolderLikeResourceType(resourceType)
  );
}

export function resourcePaneColumnClassName(options: {
  wide: boolean;
  useFullWidth: boolean;
  sidebarOpen: boolean;
  large: boolean;
}) {
  const { wide, useFullWidth, sidebarOpen, large } = options;
  return {
    'max-w-[680px]': !wide && !useFullWidth && (sidebarOpen || !large),
    'max-w-[800px]': !wide && !useFullWidth && (!sidebarOpen || large),
    'max-w-7xl': wide,
  };
}

export function useResourcePaneLayout(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  options?: {
    enabled?: boolean;
    onNearBottom?: () => void;
  }
) {
  const enabled = options?.enabled ?? true;
  const onNearBottom = options?.onNearBottom;
  const [large, setLarge] = useState(window.innerWidth > 1500);
  const [compactResourcePane, setCompactResourcePane] = useState(false);

  useEffect(() => {
    function handleSize() {
      setLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const updateCompactLayout = () =>
      setCompactResourcePane(
        scrollContainer.clientWidth <= COMPACT_RESOURCE_PANE_WIDTH
      );
    updateCompactLayout();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateCompactLayout);
      return () => window.removeEventListener('resize', updateCompactLayout);
    }

    const observer = new ResizeObserver(updateCompactLayout);
    observer.observe(scrollContainer);
    return () => observer.disconnect();
  }, [enabled, scrollContainerRef]);

  useEffect(() => {
    if (!enabled || !onNearBottom) {
      return;
    }
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        onNearBottom();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [enabled, onNearBottom, scrollContainerRef]);

  return { large, compactResourcePane };
}
