import { type Namespace, NamespaceTier } from '@/interface';

export function getPricingEntryLabelKey(
  namespace?: Pick<Namespace, 'expired' | 'tier'>
) {
  if (!namespace) return 'footer.view_pricing';

  return namespace.tier === NamespaceTier.PREMIUM && !namespace.expired
    ? 'footer.view_pricing'
    : 'footer.upgrade_version';
}
