import { NamespaceTier } from '@/interface';

const CREDIT_SCALE = 1_000_000;

export const BASIC_CREDITS_LOW_THRESHOLD = {
  a: 10,
  b: 50,
} as const;
export const PREMIUM_CREDITS_LOW_THRESHOLD = 430;

export type CreditsLowBalanceVariant = 'a' | 'b' | 'premium';
export type CreditsLowBalanceSurface = 'banner' | 'modal';

export function getCreditsLowBalanceVariant(
  tier: NamespaceTier,
  userId: string
): CreditsLowBalanceVariant {
  if (tier === NamespaceTier.PREMIUM) return 'premium';
  let hash = 2166136261;
  const value = userId || 'anonymous';
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? 'a' : 'b';
}

export function getCreditsLowBalanceThresholdCredits(
  variant: CreditsLowBalanceVariant
) {
  if (variant === 'premium') return PREMIUM_CREDITS_LOW_THRESHOLD;
  return BASIC_CREDITS_LOW_THRESHOLD[variant];
}

export function creditsToStoredUnits(credits: number) {
  return credits * CREDIT_SCALE;
}

export function storedUnitsToCredits(units: number) {
  return Math.round((units / CREDIT_SCALE) * 100) / 100;
}

export function isCreditsLowBalance(
  remainingCredits: number,
  thresholdCredits: number
) {
  return (
    remainingCredits > 0 &&
    remainingCredits < creditsToStoredUnits(thresholdCredits)
  );
}

export function getCreditsLowBalanceDismissalKey({
  namespaceId,
  tier,
  userId,
  variant,
}: {
  namespaceId: string;
  tier: NamespaceTier;
  userId: string;
  variant: CreditsLowBalanceVariant;
}) {
  return [
    'omnibox:credits-low-balance:dismissed',
    userId || 'anonymous',
    namespaceId,
    tier,
    variant,
  ].join(':');
}

export function readCreditsLowBalanceDismissed(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeCreditsLowBalanceDismissed(key: string) {
  try {
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

export function clearCreditsLowBalanceDismissed(key: string) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function creditsLowBalanceAnalyticsProps({
  namespaceId,
  remainingCredits,
  role,
  surface,
  thresholdCredits,
  tier,
  variant,
}: {
  namespaceId: string;
  remainingCredits: number;
  role: 'member' | 'owner';
  surface: CreditsLowBalanceSurface;
  thresholdCredits: number;
  tier: NamespaceTier;
  variant: CreditsLowBalanceVariant;
}) {
  return {
    namespace_id: namespaceId,
    surface,
    role,
    namespace_tier: tier,
    experiment_variant: variant,
    threshold_kibble: thresholdCredits,
    remaining_kibble: storedUnitsToCredits(remainingCredits),
    model: 'agent_2_1',
  };
}
