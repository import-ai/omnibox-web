import { useEffect } from 'react';

const EDGE_SIZE = 60;
const HORIZONTAL_PAD = 24;
const MAX_SCROLL_SPEED = 600;

/**
 * Auto-scroll a sidebar list while dragging near its top/bottom edges.
 * Only activates when the pointer is horizontally over the sidebar so that
 * editor block drags (document-level dragover) do not scroll the resource tree.
 */
export function useDragAutoScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    let scrollAnimId: number | null = null;
    let scrollStep = 0;
    let lastFrameTime = 0;
    let lastScrollDirection = 0;
    let prevClientY: number | null = null;

    const stopAutoScroll = () => {
      if (scrollAnimId !== null) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
      }
      scrollStep = 0;
    };

    const tick = () => {
      if (!element || scrollStep === 0) return;
      const now = performance.now();
      const dt = lastFrameTime
        ? Math.min((now - lastFrameTime) / 1000, 0.1)
        : 0;
      lastFrameTime = now;
      element.scrollTop += scrollStep * MAX_SCROLL_SPEED * dt;
      scrollAnimId = requestAnimationFrame(tick);
    };

    const handleDragEnd = () => {
      stopAutoScroll();
      lastScrollDirection = 0;
      prevClientY = null;
    };

    const handleWindowBlur = () => {
      stopAutoScroll();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoScroll();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const clientY = e.clientY;
      const clientX = e.clientX;

      // Ignore drags over the main editor / content area.
      const isNearSidebarX =
        clientX >= rect.left - HORIZONTAL_PAD &&
        clientX <= rect.right + HORIZONTAL_PAD;
      if (!isNearSidebarX) {
        stopAutoScroll();
        prevClientY = clientY;
        return;
      }

      const isAboveTop = clientY < rect.top + EDGE_SIZE;
      const isBelowBottom = clientY > rect.bottom - EDGE_SIZE;
      const isInsideRect = clientY >= rect.top && clientY <= rect.bottom;

      let nextScrollStep = 0;
      if (isAboveTop) nextScrollStep = -1;
      else if (isBelowBottom) nextScrollStep = 1;

      if (nextScrollStep !== 0 && !isInsideRect) {
        if (prevClientY !== null && Math.abs(clientY - prevClientY) === 0) {
          if (scrollStep === 0) nextScrollStep = 0;
        }
      }

      if (nextScrollStep !== 0) {
        const changed = scrollStep !== nextScrollStep;
        scrollStep = nextScrollStep;
        lastScrollDirection = nextScrollStep;
        if (changed || scrollAnimId === null) {
          if (scrollAnimId !== null) cancelAnimationFrame(scrollAnimId);
          lastFrameTime = performance.now();
          scrollAnimId = requestAnimationFrame(tick);
        }
      } else {
        stopAutoScroll();
      }

      prevClientY = clientY;
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget && lastScrollDirection !== 0 && scrollStep === 0) {
        scrollStep = lastScrollDirection;
        lastFrameTime = performance.now();
        scrollAnimId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAutoScroll();
    };
  }, [ref]);
}
