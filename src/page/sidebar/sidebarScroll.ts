function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Center a sidebar row inside the sidebar content scroller when possible. */
export function centerSidebarElementOnce(
  selector: string,
  behavior: ScrollBehavior = 'auto'
): boolean {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  }

  const motion =
    behavior === 'smooth' && !prefersReducedMotion() ? 'smooth' : 'auto';
  const container = element.closest<HTMLElement>('[data-sidebar="content"]');
  if (container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top =
      container.scrollTop +
      elementRect.top -
      containerRect.top -
      (container.clientHeight - elementRect.height) / 2;
    if (motion === 'smooth') {
      container.scrollTo({ top, behavior: 'smooth' });
    } else {
      container.scrollTop = top;
    }
  } else {
    element.scrollIntoView({ block: 'center', behavior: motion });
  }
  return true;
}

export async function centerSidebarElement(
  selector: string,
  {
    attempts = 60,
    options,
  }: {
    attempts?: number;
    options?: {
      signal?: AbortSignal;
      shouldApply?: () => boolean;
      behavior?: ScrollBehavior;
    };
  } = {}
): Promise<void> {
  await new Promise<void>(resolve => {
    let remainingAttempts = attempts;
    let previousTop: number | null = null;
    let stableFrames = 0;
    const scroll = () => {
      if (options?.signal?.aborted || options?.shouldApply?.() === false) {
        resolve();
        return;
      }
      const element = document.querySelector(selector);
      if (element) {
        const top = Math.round(element.getBoundingClientRect().top);
        stableFrames = top === previousTop ? stableFrames + 1 : 0;
        previousTop = top;
        if (stableFrames >= 1 || remainingAttempts === 1) {
          centerSidebarElementOnce(selector, options?.behavior);
          resolve();
          return;
        }
      }
      remainingAttempts -= 1;
      if (remainingAttempts > 0) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(scroll);
  });
}
