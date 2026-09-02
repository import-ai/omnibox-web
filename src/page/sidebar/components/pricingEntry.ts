import { type Namespace, NamespaceTier } from '@/interface';

export function getPricingEntryVariant(
  namespace?: Pick<Namespace, 'expired' | 'tier'>
): 'renew' | 'upgrade' | undefined {
  if (!namespace) return undefined;
  if (namespace.expired) return 'upgrade';
  if (!namespace.tier) return undefined;

  return namespace.tier === NamespaceTier.BASIC ? 'upgrade' : 'renew';
}
