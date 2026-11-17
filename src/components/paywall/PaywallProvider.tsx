import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/sendTrackEvent';

import { PaywallContext } from './paywallContext';
import { PaywallDialog } from './PaywallDialog';
import { PAYWALL_SCENES } from './paywallScenes';
import type {
  PaywallDismissReason,
  PaywallRequest,
  PaywallScene,
  ShowPaywallOptions,
} from './paywallTypes';

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PaywallRequest | null>(null);
  const requestRef = useRef<PaywallRequest | null>(null);
  requestRef.current = request;
  const nextIdRef = useRef(0);

  const hidePaywall = useCallback(
    (reason: PaywallDismissReason = 'dismiss') => {
      const current = requestRef.current;
      if (!current) return;
      requestRef.current = null;
      void track('paywall_dismiss', {
        scene: current.scene,
        reason,
        trigger: current.trigger,
        namespace_id: current.namespaceId,
        quota_exhausted: true,
      }).catch(() => undefined);
      setRequest(null);
    },
    []
  );

  const showPaywall = useCallback(
    (scene: PaywallScene, options: ShowPaywallOptions = {}) => {
      const current = requestRef.current;
      if (current) {
        const currentPriority = PAYWALL_SCENES[current.scene].priority;
        if (currentPriority >= PAYWALL_SCENES[scene].priority) {
          void track('paywall_suppressed', {
            scene,
            reason: 'priority',
            active_scene: current.scene,
            trigger: options.trigger,
            namespace_id: options.namespaceId,
            quota_exhausted: true,
          }).catch(() => undefined);
          return;
        }
      }

      const next: PaywallRequest = {
        ...options,
        id: ++nextIdRef.current,
        scene,
      };
      requestRef.current = next;
      setRequest(next);
    },
    []
  );

  const value = useMemo(
    () => ({ request, showPaywall, hidePaywall }),
    [hidePaywall, request, showPaywall]
  );

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallDialog />
    </PaywallContext.Provider>
  );
}
