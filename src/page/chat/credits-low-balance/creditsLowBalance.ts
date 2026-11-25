import { NamespaceTier } from '@/interface';

const CREDIT_SCALE = 1_000_000;

export type CreditsLowBalanceVariant = string;
export type CreditsLowBalanceSurface = 'banner' | 'modal';

export interface CreditsLowBalanceExperiment {
  experiment_id: number;
  group_id: number;
  basic_threshold?: number;
  pro_threshold?: number;
}

export function resolveCreditsLowBalance(
  tier: NamespaceTier,
  experiment?: CreditsLowBalanceExperiment
) {
  const premium = tier === NamespaceTier.PREMIUM;
  const threshold = premium
    ? experiment?.pro_threshold
    : experiment?.basic_threshold;
  if (
    experiment &&
    typeof threshold === 'number' &&
    Number.isFinite(threshold) &&
    threshold > 0 &&
    threshold <= Number.MAX_SAFE_INTEGER / CREDIT_SCALE
  ) {
    return {
      variant: `ab:${experiment.experiment_id}:${experiment.group_id}`,
      thresholdCredits: threshold,
    };
  }
  return {
    variant: 'default',
    thresholdCredits: premium ? 430 : 10,
  };
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
