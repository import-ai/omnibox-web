import { findVirtualResourcePlacement } from './virtualFolderSpans';
import { RESOURCE_ROW_HEIGHT } from './virtualResourceTree';

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

function scrollVirtualResourceOnce(
  resourceId: string,
  behavior: ScrollBehavior = 'auto'
) {
  const placement = findVirtualResourcePlacement(resourceId);
  if (!placement) return false;
  const list = document.querySelector(
    `[data-virtual-resource-list="${placement.listId}"]`
  );
  const scroller =
    list instanceof HTMLElement
      ? list.closest<HTMLElement>('[data-sidebar="content"]')
      : null;
  if (!(list instanceof HTMLElement) || !scroller) return false;

  const top =
    list.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop +
    placement.index * RESOURCE_ROW_HEIGHT;
  const nextTop = Math.max(
    0,
    top - (scroller.clientHeight - RESOURCE_ROW_HEIGHT) / 2
  );
  const motion =
    behavior === 'smooth' && !prefersReducedMotion() ? 'smooth' : 'auto';
  if (motion === 'smooth') {
    scroller.scrollTo({ top: nextTop, behavior: 'smooth' });
  } else {
    scroller.scrollTop = nextTop;
  }
  return true;
}

/**
 * Scroll a virtualized row that is not mounted. Mounted rows return false so
 * the caller can center them from their measured rect.
 */
export async function scrollVirtualResourceIntoView(
  resourceId: string,
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
): Promise<boolean> {
  const selector = `[data-resource-id="${resourceId}"]`;
  const attempt = () => {
    if (options?.signal?.aborted || options?.shouldApply?.() === false) {
      return 'cancelled' as const;
    }
    if (document.querySelector(selector)) return 'mounted' as const;
    return scrollVirtualResourceOnce(resourceId, options?.behavior)
      ? ('scrolled' as const)
      : ('pending' as const);
  };

  const first = attempt();
  if (first === 'scrolled') return true;
  if (first !== 'pending') return false;

  return new Promise(resolve => {
    let remainingAttempts = attempts;
    const scroll = () => {
      const result = attempt();
      if (result === 'scrolled') {
        resolve(true);
        return;
      }
      if (result !== 'pending') {
        resolve(false);
        return;
      }
      remainingAttempts -= 1;
      if (remainingAttempts > 0) {
        requestAnimationFrame(scroll);
      } else {
        resolve(false);
      }
    };
    requestAnimationFrame(scroll);
  });
}
