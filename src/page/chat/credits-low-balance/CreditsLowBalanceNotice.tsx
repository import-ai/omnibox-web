import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { usePaywall } from '@/components/paywall/paywallContext';
import type { PaywallDismissReason } from '@/components/paywall/paywallTypes';
import { useNamespaceInfo } from '@/hooks/useNamespaceInfo';
import { NamespaceTier } from '@/interface';
import { useNamespaceRole } from '@/lib/useNamespaceRole';
import { subscribeCredentials } from '@/page/user/util';

import {
  type CreditsLowBalanceExperiment,
  creditsToStoredUnits,
  getCreditsLowBalanceDismissalKey,
  isCreditsLowBalance,
  readCreditsLowBalanceDismissed,
  resolveCreditsLowBalance,
  writeCreditsLowBalanceDismissed,
} from './creditsLowBalance';
import { CreditsLowBalanceBanner } from './CreditsLowBalanceBanner';

interface CreditsLowBalanceNoticeProps {
  namespaceId?: string;
  remainingCredits?: number;
  experiment?: CreditsLowBalanceExperiment;
  selectedEdition?: 'basic' | 'pro';
}

function subscribeUserId(listener: () => void) {
  return subscribeCredentials(() => listener());
}

function getUserId() {
  try {
    return localStorage.getItem('uid') ?? '';
  } catch {
    return '';
  }
}

function getServerUserId() {
  return '';
}

export function CreditsLowBalanceNotice({
  namespaceId,
  remainingCredits,
  experiment,
  selectedEdition,
}: CreditsLowBalanceNoticeProps) {
  const userId = useSyncExternalStore(
    subscribeUserId,
    getUserId,
    getServerUserId
  );
  const { namespace, resolvedId } = useNamespaceInfo(namespaceId);
  const { role, loading: roleLoading } = useNamespaceRole(
    namespaceId,
    namespace?.is_owner === undefined
  );
  const { request, hidePaywall, showPaywall } = usePaywall();
  const shownPromptRef = useRef<string | null>(null);

  const tier = namespace?.tier ?? NamespaceTier.BASIC;
  const isOwner = namespace?.is_owner ?? role === 'owner';
  const roleResolved =
    !namespaceId ||
    namespace?.is_owner !== undefined ||
    (resolvedId === namespaceId && !roleLoading);
  const { variant, thresholdCredits } = resolveCreditsLowBalance(
    tier,
    experiment
  );
  const storageKey = namespaceId
    ? getCreditsLowBalanceDismissalKey({
        namespaceId,
        tier,
        userId,
      })
    : '';
  const [dismissal, setDismissal] = useState<{
    key: string;
    threshold: number;
  }>();
  const dismissedAt =
    dismissal?.key === storageKey ? dismissal.threshold : undefined;

  useEffect(() => {
    if (!storageKey) return;
    setDismissal({
      key: storageKey,
      threshold: readCreditsLowBalanceDismissed(storageKey),
    });
  }, [storageKey]);

  useEffect(() => {
    if (
      !storageKey ||
      !dismissedAt ||
      remainingCredits === undefined ||
      remainingCredits < creditsToStoredUnits(dismissedAt)
    ) {
      return;
    }
    shownPromptRef.current = null;
    setDismissal({ key: storageKey, threshold: 0 });
    void writeCreditsLowBalanceDismissed(storageKey, 0);
  }, [dismissedAt, remainingCredits, storageKey]);

  const dismissPrompt = useCallback(
    (reason?: PaywallDismissReason) => {
      if (reason === 'automatic' || !storageKey) return;
      setDismissal({ key: storageKey, threshold: thresholdCredits });
      void writeCreditsLowBalanceDismissed(storageKey, thresholdCredits);
    },
    [storageKey, thresholdCredits]
  );

  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    const current = requestRef.current;
    if (
      current?.scene === 'credits_low' &&
      current.namespaceId === namespaceId &&
      (selectedEdition !== 'pro' ||
        remainingCredits === undefined ||
        !isCreditsLowBalance(remainingCredits, thresholdCredits))
    ) {
      hidePaywall('automatic');
    }
  }, [
    hidePaywall,
    namespaceId,
    remainingCredits,
    selectedEdition,
    thresholdCredits,
  ]);

  useEffect(() => {
    return () => {
      const current = requestRef.current;
      if (
        current?.scene === 'credits_low' &&
        current.namespaceId === namespaceId
      ) {
        hidePaywall('automatic');
      }
    };
  }, [hidePaywall, namespaceId]);

  const isLow =
    remainingCredits !== undefined &&
    isCreditsLowBalance(remainingCredits, thresholdCredits);
  const dismissed = dismissedAt !== 0;

  useEffect(() => {
    if (selectedEdition !== 'pro' || !isLow) {
      shownPromptRef.current = null;
    }
  }, [isLow, selectedEdition]);
  const promptKey = storageKey;

  useEffect(() => {
    if (
      !namespaceId ||
      remainingCredits === undefined ||
      tier !== NamespaceTier.BASIC ||
      selectedEdition !== 'pro' ||
      !isLow ||
      dismissed ||
      !roleResolved
    ) {
      return;
    }
    if (request) return;
    if (shownPromptRef.current === promptKey) return;

    const shown = showPaywall('credits_low', {
      namespaceId,
      tier,
      isOwner,
      trigger: 'chat_credits_low_balance_modal',
      quotaExhausted: false,
      experimentVariant: variant,
      thresholdCredits,
      remainingCredits,
      onDismiss: dismissPrompt,
    });
    if (shown) shownPromptRef.current = promptKey;
  }, [
    dismissPrompt,
    dismissed,
    isLow,
    isOwner,
    namespaceId,
    promptKey,
    remainingCredits,
    request,
    roleResolved,
    selectedEdition,
    showPaywall,
    thresholdCredits,
    tier,
    variant,
  ]);

  if (
    !namespaceId ||
    remainingCredits === undefined ||
    tier !== NamespaceTier.PREMIUM ||
    selectedEdition !== 'pro' ||
    !isLow ||
    dismissed ||
    !roleResolved
  ) {
    return null;
  }

  return (
    <CreditsLowBalanceBanner
      isOwner={isOwner}
      namespaceId={namespaceId}
      onDismiss={dismissPrompt}
      remainingCredits={remainingCredits}
      thresholdCredits={thresholdCredits}
      variant={variant}
    />
  );
}
