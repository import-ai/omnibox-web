import { usePaywall } from '@/components/paywall/paywallContext';
import type { Namespace } from '@/interface';

export function useExpiredNamespaceGate(
  namespaceId: string,
  namespace?: Namespace
) {
  const { showPaywall } = usePaywall();

  return (trigger: string) => {
    if (!namespace?.expired || namespace.id !== namespaceId) return false;
    showPaywall('namespace_expired', {
      namespaceId,
      tier: namespace.tier,
      isOwner: namespace.is_owner,
      trigger,
    });
    return true;
  };
}
