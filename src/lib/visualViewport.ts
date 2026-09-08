export type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop'>;

export type VisualViewportMetrics = {
  height: number;
  offsetTop: number;
  keyboardOpen: boolean;
};

export type VisualViewportTarget = {
  document: Document;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
  visualViewport?: VisualViewportLike | null;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  setTimeout: (callback: () => void, delay?: number) => number;
  clearTimeout: (id: number) => void;
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
  scrollTo: (x: number, y: number) => void;
};

// Address-bar show/hide is typically well under 100px; a keyboard is not.
const KEYBOARD_OPEN_THRESHOLD_PX = 150;

export function getVisualViewportMetrics(
  visualViewport: VisualViewportLike | null | undefined,
  innerHeight: number
): VisualViewportMetrics {
  const height = visualViewport?.height || innerHeight;
  const offsetTop = visualViewport?.offsetTop || 0;
  const keyboardOpen =
    offsetTop > 0 || innerHeight - height > KEYBOARD_OPEN_THRESHOLD_PX;

  return { height, offsetTop, keyboardOpen };
}

export function applyVisualViewportMetrics(
  root: HTMLElement,
  metrics: VisualViewportMetrics
): void {
  root.style.setProperty('--app-height', `${metrics.height}px`);
  root.style.setProperty('--app-offset-top', `${metrics.offsetTop}px`);
  root.classList.toggle('keyboard-open', metrics.keyboardOpen);
}

export function syncVisualViewport(
  target: VisualViewportTarget = window as unknown as VisualViewportTarget
): VisualViewportMetrics {
  const metrics = getVisualViewportMetrics(
    target.visualViewport,
    target.innerHeight
  );
  applyVisualViewportMetrics(target.document.documentElement, metrics);
  if (target.scrollX !== 0 || target.scrollY !== 0) {
    target.scrollTo(0, 0);
  }
  return metrics;
}

export function bindVisualViewport(
  target: VisualViewportTarget = window as unknown as VisualViewportTarget
): () => void {
  let keyboardTimers: number[] = [];
  const visualViewport = target.visualViewport as
    | (VisualViewportLike & {
        addEventListener?: Window['addEventListener'];
        removeEventListener?: Window['removeEventListener'];
      })
    | null
    | undefined;

  const sync = () => {
    syncVisualViewport(target);
  };

  const syncAfterFrame = () => {
    sync();
    target.requestAnimationFrame(sync);
  };

  const syncAfterKeyboardAnimation = () => {
    keyboardTimers.forEach(id => target.clearTimeout(id));
    keyboardTimers = [
      target.setTimeout(sync, 50),
      target.setTimeout(sync, 300),
    ];
    syncAfterFrame();
  };

  sync();
  target.addEventListener('resize', syncAfterFrame);
  target.addEventListener('orientationchange', syncAfterKeyboardAnimation);
  target.addEventListener('scroll', sync, { passive: true });
  target.addEventListener('focusin', syncAfterKeyboardAnimation);
  target.addEventListener('focusout', syncAfterKeyboardAnimation);
  visualViewport?.addEventListener?.('resize', syncAfterFrame);
  visualViewport?.addEventListener?.('scroll', sync);

  return () => {
    keyboardTimers.forEach(id => target.clearTimeout(id));
    target.removeEventListener('resize', syncAfterFrame);
    target.removeEventListener('orientationchange', syncAfterKeyboardAnimation);
    target.removeEventListener('scroll', sync);
    target.removeEventListener('focusin', syncAfterKeyboardAnimation);
    target.removeEventListener('focusout', syncAfterKeyboardAnimation);
    visualViewport?.removeEventListener?.('resize', syncAfterFrame);
    visualViewport?.removeEventListener?.('scroll', sync);
  };
}
