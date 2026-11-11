import {
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { BehaviorProps } from '@/lib/behaviorEngine';
import { useBehaviorSurface } from '@/lib/behaviorTracking';

type ExposureProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  target: string;
  props?: BehaviorProps;
  active?: boolean;
  children: ReactElement<{ ref?: (node: HTMLElement | null) => void }>;
};
/** Measure the actual portalled item and preserve Radix's injected trigger props/ref. */
export const BehaviorExposure = forwardRef<HTMLElement, ExposureProps>(
  function BehaviorExposure(
    { target, props, children, active = true, ...injected },
    forwardedRef
  ) {
    const [node, setNode] = useState<HTMLElement | null>(null);
    const [visible, setVisible] = useState(false);
    const ref = useCallback(
      (element: HTMLElement | null) => {
        setNode(element);
        if (typeof forwardedRef === 'function') forwardedRef(element);
        else if (forwardedRef) forwardedRef.current = element;
      },
      [forwardedRef]
    );
    useEffect(() => {
      setVisible(false);
      if (!node || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(entries =>
        setVisible(
          entries.some(
            entry => entry.isIntersecting && entry.intersectionRatio > 0
          )
        )
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, [node]);
    useBehaviorSurface({
      scope: 'surface',
      target,
      props: {
        ...props,
        ...(target === 'resource_creation_entry'
          ? {
              enabled:
                !!node &&
                !node.matches(
                  ':disabled, [aria-disabled="true"], [data-disabled]'
                ),
            }
          : {}),
      },
      active: active && !!node && visible,
    });
    return cloneElement(children, { ...injected, ref });
  }
);
