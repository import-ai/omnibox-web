import { type Namespace, NamespaceTier } from '@/interface';

export function getPricingEntryVariant(
  namespace?: Pick<Namespace, 'tier'>
): 'renew' | 'upgrade' | undefined {
  if (!namespace) return undefined;

  return namespace.tier === NamespaceTier.BASIC ? 'upgrade' : 'renew';
}
