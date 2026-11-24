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
  clearCreditsLowBalanceDismissed,
  creditsToStoredUnits,
  getCreditsLowBalanceDismissalKey,
  getCreditsLowBalanceThresholdCredits,
  getCreditsLowBalanceVariant,
  isCreditsLowBalance,
  readCreditsLowBalanceDismissed,
  writeCreditsLowBalanceDismissed,
} from './creditsLowBalance';
import { CreditsLowBalanceBanner } from './CreditsLowBalanceBanner';

interface CreditsLowBalanceNoticeProps {
  namespaceId?: string;
  remainingCredits?: number;
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
  const variant = getCreditsLowBalanceVariant(tier, userId);
  const thresholdCredits = getCreditsLowBalanceThresholdCredits(variant);
  const threshold = creditsToStoredUnits(thresholdCredits);
  const storageKey = namespaceId
    ? getCreditsLowBalanceDismissalKey({
        namespaceId,
        tier,
        userId,
        variant,
      })
    : '';
  const [dismissedKey, setDismissedKey] = useState<string | null>(() =>
    storageKey && readCreditsLowBalanceDismissed(storageKey) ? storageKey : null
  );

  useEffect(() => {
    if (!storageKey) return;
    setDismissedKey(
      readCreditsLowBalanceDismissed(storageKey) ? storageKey : null
    );
  }, [storageKey]);

  useEffect(() => {
    if (
      !storageKey ||
      remainingCredits === undefined ||
      remainingCredits < threshold
    ) {
      return;
    }
    clearCreditsLowBalanceDismissed(storageKey);
    shownPromptRef.current = null;
    setDismissedKey(current => (current === storageKey ? null : current));
  }, [remainingCredits, storageKey, threshold]);

  const dismissPrompt = useCallback(
    (reason?: PaywallDismissReason) => {
      if (reason === 'automatic') return;
      if (!storageKey) return;
      writeCreditsLowBalanceDismissed(storageKey);
      setDismissedKey(storageKey);
    },
    [storageKey]
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
  const dismissed = dismissedKey === storageKey;

  useEffect(() => {
    if (selectedEdition !== 'pro' || !isLow) {
      shownPromptRef.current = null;
    }
  }, [isLow, selectedEdition]);
  const promptKey = `${storageKey}:${thresholdCredits}`;

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
