import { useEffect } from 'react';

const EDGE_SIZE = 80;
const MAX_SCROLL_SPEED = 1100;
const HIDE_SCROLLBARS_CLASS = 'is-dragging-hide-scrollbars';

/** Edge auto-scroll for the resource body during editor block drags. */
export function useResourceBodyDragAutoScroll(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

    let animId: number | null = null;
    let step = 0;
    let lastFrameTime = 0;

    const stop = () => {
      if (animId !== null) cancelAnimationFrame(animId);
      animId = null;
      step = 0;
    };

    const endDrag = () => {
      stop();
      document.documentElement.classList.remove(HIDE_SCROLLBARS_CLASS);
    };

    const tick = () => {
      const el = ref.current;
      if (!el || step === 0) return;
      const now = performance.now();
      const dt = lastFrameTime
        ? Math.min((now - lastFrameTime) / 1000, 0.1)
        : 0;
      lastFrameTime = now;
      el.scrollTop += step * MAX_SCROLL_SPEED * dt;
      animId = requestAnimationFrame(tick);
    };

    const onDragOver = (e: DragEvent) => {
      document.documentElement.classList.add(HIDE_SCROLLBARS_CLASS);

      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const y = e.clientY;
      let next = 0;
      if (y < rect.top + EDGE_SIZE) next = -1;
      else if (y > rect.bottom - EDGE_SIZE) next = 1;

      if (next === 0) {
        stop();
        return;
      }

      if (step !== next || animId === null) {
        step = next;
        if (animId !== null) cancelAnimationFrame(animId);
        lastFrameTime = performance.now();
        animId = requestAnimationFrame(tick);
      }
    };

    const capture = true;
    document.addEventListener('dragover', onDragOver, capture);
    document.addEventListener('dragend', endDrag, capture);
    document.addEventListener('drop', endDrag, capture);
    window.addEventListener('blur', endDrag);

    return () => {
      document.removeEventListener('dragover', onDragOver, capture);
      document.removeEventListener('dragend', endDrag, capture);
      document.removeEventListener('drop', endDrag, capture);
      window.removeEventListener('blur', endDrag);
      endDrag();
    };
  }, [enabled, ref]);
}
