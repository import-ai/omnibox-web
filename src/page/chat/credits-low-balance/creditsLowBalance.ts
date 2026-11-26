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
}: {
  namespaceId: string;
  tier: NamespaceTier;
  userId: string;
}) {
  return [
    'omnibox:credits-low-balance:dismissed',
    userId || 'anonymous',
    namespaceId,
    tier,
    'v2',
  ].join(':');
}

export function legacyDismissalThresholds(key: string) {
  const prefix = key.slice(0, -2);
  return key.endsWith(`:${NamespaceTier.PREMIUM}:v2`)
    ? [[`${prefix}premium`, 430] as const]
    : [[`${prefix}b`, 50] as const, [`${prefix}a`, 10] as const];
}

export function readCreditsLowBalanceDismissed(key: string) {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) return Number(saved) || 0;
    const migrated =
      legacyDismissalThresholds(key).find(
        ([legacyKey]) => localStorage.getItem(legacyKey) === '1'
      )?.[1] ?? 0;
    writeCreditsLowBalanceDismissed(key, migrated);
    return migrated;
  } catch {
    return 0;
  }
}

export function writeCreditsLowBalanceDismissed(
  key: string,
  threshold: number
) {
  try {
    localStorage.setItem(key, String(threshold));
  } catch {
    // Keep the current component state when persistence is unavailable.
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
