import { useEffect, useState } from 'react';

import { useIsMobile } from './use-mobile';

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if device has touch capability
    const hasTouchCapability =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches;

    setIsTouch(hasTouchCapability);
  }, []);

  // Combined approach: touch capability AND small screen
  return isTouch && isMobile;
}
