import { useEffect } from 'react';

const EDGE_SIZE = 60;
const MAX_SCROLL_SPEED = 600;

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
    const handleDrop = () => {
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
    document.addEventListener('drop', handleDrop);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAutoScroll();
    };
  }, [ref]);
}
