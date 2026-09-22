import { useEffect, useState } from 'react';

/** Use page navigation on phones and portrait touch tablets. */
export function useInviteSinglePage() {
  const [singlePage, setSinglePage] = useState(false);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 767px)');
    const portrait = window.matchMedia('(orientation: portrait)');
    const touch = window.matchMedia('(any-pointer: coarse)');
    const update = () =>
      setSinglePage(
        narrow.matches ||
          (portrait.matches && (touch.matches || navigator.maxTouchPoints > 1))
      );
    const queries = [narrow, portrait, touch];
    queries.forEach(query => query.addEventListener('change', update));
    update();
    return () =>
      queries.forEach(query => query.removeEventListener('change', update));
  }, []);
  return singlePage;
}
