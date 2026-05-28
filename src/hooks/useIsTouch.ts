import { useEffect, useState } from 'react';

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check if device has touch capability
    const hasTouchCapability =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches;

    setIsTouch(hasTouchCapability);
  }, []);

  return isTouch;
}
