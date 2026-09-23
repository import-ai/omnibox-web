/** Center a sidebar row inside the sidebar content scroller when possible. */
export function centerSidebarElementOnce(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  }

  const container = element.closest<HTMLElement>('[data-sidebar="content"]');
  if (container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollTop +=
      elementRect.top -
      containerRect.top -
      (container.clientHeight - elementRect.height) / 2;
  } else {
    element.scrollIntoView({ block: 'center', behavior: 'auto' });
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
    options?: { signal?: AbortSignal; shouldApply?: () => boolean };
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
          centerSidebarElementOnce(selector);
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
