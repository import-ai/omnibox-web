import { useEffect, useRef } from 'react';

import { trackInviteReferralHomeEntryView } from './tracking';

// The desktop sidebar slides in with a 200ms `left` transition. Intersection
// Observer can miss that movement, so measure the entry again after it settles.
const SIDEBAR_SLIDE_MS = 300;

type EntryBox = Pick<
  DOMRect,
  'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'
>;

export function inviteEntryOnScreen(
  box: EntryBox,
  viewport: { width: number; height: number }
): boolean | null {
  if (box.width === 0 && box.height === 0) return null;
  if (box.width <= 0 || box.height <= 0) return false;
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  return (
    box.bottom > 0 &&
    box.right > 0 &&
    box.top < viewport.height &&
    box.left < viewport.width
  );
}

function entryOnScreen(element: HTMLElement) {
  return inviteEntryOnScreen(element.getBoundingClientRect(), {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  });
}

export function useInviteReferralEntryExposure(
  enabled: boolean,
  pathname: string
) {
  const entryRef = useRef<HTMLDivElement>(null);
  const wasVisible = useRef(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      wasVisible.current = false;
    }
    if (!enabled) {
      wasVisible.current = false;
      return;
    }
    const element = entryRef.current;
    if (!element) return;
    let active = true;
    let intersecting = false;
    const update = () => {
      if (!active) return;
      const onScreen = entryOnScreen(element);
      const visible =
        (onScreen === null ? intersecting : onScreen) &&
        document.visibilityState === 'visible';
      if (visible && !wasVisible.current) trackInviteReferralHomeEntryView();
      wasVisible.current = visible;
    };
    const onPageShow = (event: Event) => {
      const restored =
        'persisted' in event &&
        (event as { persisted?: boolean }).persisted === true;
      if (restored) wasVisible.current = false;
      update();
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(candidate => candidate.target === element);
      if (!entry) return;
      intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
      update();
    });
    observer.observe(element);
    update();
    document.addEventListener('visibilitychange', update);
    document.addEventListener('transitionend', update);
    window.addEventListener('pageshow', onPageShow);
    const slideTimer = window.setTimeout(update, SIDEBAR_SLIDE_MS);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      document.removeEventListener('transitionend', update);
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(slideTimer);
    };
  }, [enabled, pathname]);

  return entryRef;
}
