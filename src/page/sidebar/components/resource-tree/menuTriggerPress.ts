import { useRef } from 'react';

/**
 * Dropdown triggers call preventDefault on pointerdown. Once the trigger is
 * focused, that suppresses the CSS :active press. Mouse-opened menus should
 * not move focus back onto the trigger when they close.
 */
export function useMenuTriggerPress() {
  const openedWithPointer = useRef(false);

  return {
    triggerProps: {
      onPointerDown: () => {
        openedWithPointer.current = true;
      },
      onKeyDown: () => {
        openedWithPointer.current = false;
      },
    },
    contentProps: {
      onCloseAutoFocus: (event: Event) => {
        if (openedWithPointer.current) {
          event.preventDefault();
        }
      },
    },
  };
}
