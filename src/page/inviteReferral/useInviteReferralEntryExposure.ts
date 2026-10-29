import { useEffect, useRef } from 'react';

import { trackInviteReferralHomeEntryView } from './tracking';

export function useInviteReferralEntryExposure(enabled: boolean) {
  const entryRef = useRef<HTMLDivElement>(null);
  const wasVisible = useRef(false);

  useEffect(() => {
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
      const visible = intersecting && document.visibilityState === 'visible';
      if (visible && !wasVisible.current) trackInviteReferralHomeEntryView();
      wasVisible.current = visible;
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(candidate => candidate.target === element);
      if (!entry) return;
      intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [enabled]);

  return entryRef;
}
