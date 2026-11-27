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
        quota_exhausted: current.quotaExhausted ?? true,
        experiment_variant: current.experimentVariant,
        threshold_kibble: current.thresholdCredits,
        remaining_kibble: toDisplayCredits(current.remainingCredits),
      }).catch(() => undefined);
      if (
        current.scene === 'credits_low' &&
        (reason === 'close' || reason === 'dismiss' || reason === 'escape')
      ) {
        void track('credits_low_balance_dismiss', {
          surface: 'modal',
          dismiss:
            reason === 'close'
              ? 'button'
              : reason === 'escape'
                ? 'escape'
                : 'outside',
          role: current.isOwner ? 'owner' : 'member',
          namespace_tier: current.tier,
          namespace_id: current.namespaceId,
          experiment_variant: current.experimentVariant,
          threshold_kibble: current.thresholdCredits,
          remaining_kibble: toDisplayCredits(current.remainingCredits),
        }).catch(() => undefined);
      }
      current.onDismiss?.(reason);
      setRequest(null);
    },
    []
  );

  const showPaywall = useCallback(
    (scene: PaywallScene, options: ShowPaywallOptions = {}) => {
      const quotaExhausted =
        options.quotaExhausted ?? PAYWALL_SCENES[scene].quotaExhausted ?? true;
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
            quota_exhausted: quotaExhausted,
          }).catch(() => undefined);
          return false;
        }
      }

      const next: PaywallRequest = {
        ...options,
        id: ++nextIdRef.current,
        scene,
        quotaExhausted,
      };
      requestRef.current = next;
      setRequest(next);
      return true;
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

function toDisplayCredits(units?: number) {
  return units === undefined
    ? undefined
    : Math.round((units / 1_000_000) * 100) / 100;
}
